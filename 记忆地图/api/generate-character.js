const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const sharp = require('sharp');

const DEFAULT_BASE_URL = 'https://new.suxi.ai';
const DEFAULT_MODEL = 'gemini-3.1-flash-image';
const MAX_DATA_URL_LENGTH = 2_800_000;

const STYLE_REFERENCES = [
  ['style-sheet.jpg', 'image/jpeg'],
  ['rowing.png', 'image/png'],
  ['beach.png', 'image/png'],
];

function parseRequestBody(body) {
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return null; }
  }
  return body && typeof body === 'object' ? body : null;
}

function parseImageDataUrl(value) {
  if (typeof value !== 'string') {
    console.error('parseImageDataUrl: value is not a string');
    return null;
  }
  if (value.length > 50_000_000) {
    console.error('parseImageDataUrl: value too long:', value.length);
    return null;
  }
  const cleanValue = value.replace(/\s/g, ''); // Remove any newlines or spaces
  const match = cleanValue.match(/^data:(.*?);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    console.error('parseImageDataUrl: regex failed to match. Prefix:', cleanValue.substring(0, 100));
    return null;
  }
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.length > 40_000_000) {
    console.error('parseImageDataUrl: invalid bytes length:', bytes.length);
    return null;
  }
  return { bytes, mimeType: match[1], dataUrl: cleanValue };
}

function buildPrompt(peopleCount, personProfiles = [], subjectType = 'person') {
  if (subjectType === 'object') {
    return [
      'CRITICAL: Image 1 is the STRICT reference for the object/food. You MUST preserve its core shape, colors, and recognizable features.',
      'Images 2, 3, and 4 are style-only references. Never copy their subjects.',
      'Create a beautiful, appetizing, and cute sticker of the main object/food in Image 1.',
      'Translate the object from Image 1 into a specific reference style: rounded simplified shapes, soft cel shading, gentle highlights, warm pastel palette, and a polished cute mobile-sticker finish.',
      'Add a clean thick white sticker outline, followed by a very thin dark outer keyline, around the complete object.',
      'The canvas background MUST be a perfectly uniform solid pure white (#FFFFFF). No texture, no checkerboard, no shadow, no scenery, no floor.',
      'Keep the entire silhouette inside a square canvas with generous empty padding.'
    ].join(' ');
  }

  const subject = peopleCount > 1 
    ? `Create a group chibi sticker character featuring exactly ${peopleCount} people.` 
    : `Create one centered chibi sticker character.`;
    
  const validProfiles = (personProfiles || []).filter(p => p && p.baseCharacterUri);
  let identityConstraints = [
    'CRITICAL: Image 1 is the STRICT identity, pose, and framing source. You MUST preserve the exact poses, gestures, body language, and framing (full-body or half-body) of all people from Image 1 1:1.',
    'CRITICAL: Ensure all body parts in the frame (especially hands and arms) are completely drawn. Do not awkwardly crop hands or arms at the edges of the sticker. Keep the character fully contained and beautifully framed.'
  ];

  if (validProfiles.length > 0) {
    identityConstraints.push(`CRITICAL: You MUST maintain strict facial consistency for the recognized people in the photo. The last ${validProfiles.length} image(s) provided are the reference AI characters for these people. You MUST perfectly replicate their exact face, eye shape, hairstyle, and hair color from the reference characters, while adapting their clothing to match Image 1.`);
  } else {
    identityConstraints.push('CRITICAL: You MUST preserve all specific accessories (like sunglasses, glasses, hats), distinct clothing details, hairstyles, hair colors, and skin tones exactly as seen in Image 1.');
  }

  return [
    ...identityConstraints,
    'Images 2, 3, and 4 are style-only references. Never copy their people, logos, watermarks, text, or signatures.',
    subject,
    'Translate the people from Image 1 into this specific reference style: oversized rounded heads, compact chibi bodies, large clean oval eyes (unless wearing sunglasses or glasses), dark smooth hand-inked outlines, rounded simplified shapes, soft cel shading, gentle highlights, warm pastel palette, and a polished cute mobile-sticker finish.',
    'Add a clean thick white sticker outline, followed by a very thin dark outer keyline, around the complete characters and essential props.',
    'The canvas background MUST be a perfectly uniform solid pure white (#FFFFFF). No texture, no checkerboard, no gradient, no shadows, no scenery, no floor, no frame, no text, no logo, no signature, no watermark, no UI.',
    'Keep hands simple and readable. Keep the entire silhouette inside a square canvas with generous empty padding.',
  ].join(' ');
}

function referenceDataUrls() {
  const root = join(process.cwd(), 'api', 'style-references');
  return STYLE_REFERENCES.map(([fileName, mimeType]) =>
    `data:${mimeType};base64,${readFileSync(join(root, fileName)).toString('base64')}`
  );
}

function buildUpstreamPayload(portrait, model = DEFAULT_MODEL, peopleCount = 1, personProfiles = [], subjectType = 'person') {
  const content = [
    { type: 'text', text: buildPrompt(peopleCount, personProfiles, subjectType) },
    { type: 'image_url', image_url: { url: portrait.dataUrl } },
    ...referenceDataUrls().map((url) => ({ type: 'image_url', image_url: { url } })),
  ];

  // Append valid reference characters at the end
  const validProfiles = (personProfiles || []).filter(p => p && p.baseCharacterUri);
  for (const profile of validProfiles) {
    if (profile.baseCharacterUri) {
      content.push({ type: 'image_url', image_url: { url: profile.baseCharacterUri } });
    }
  }

  return {
    model,
    messages: [{ role: 'user', content }],
    stream: false,
  };
}

function findGeneratedDataUrl(payload) {
  const candidates = [
    payload?.data?.[0]?.b64_json && `data:image/png;base64,${payload.data[0].b64_json}`,
    payload?.choices?.[0]?.message?.images?.[0]?.image_url?.url,
  ];
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    const cleanContent = content.replace(/\s/g, '');
    const b64Match = cleanContent.match(/data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+/);
    if (b64Match) candidates.push(b64Match[0]);
    
    if (/^[A-Za-z0-9+/=]{1000,}$/.test(cleanContent)) {
      let mime = 'image/png';
      if (cleanContent.startsWith('/9j/')) mime = 'image/jpeg';
      else if (cleanContent.startsWith('UklGR')) mime = 'image/webp';
      else if (cleanContent.startsWith('R0lGOD')) mime = 'image/gif';
      candidates.push(`data:${mime};base64,${cleanContent}`);
    }

    // Support markdown image links from jimeng-4.5
    const urlMatch = content.match(/!\[.*?\]\((https:\/\/[^\)]+)\)/);
    if (urlMatch) candidates.push(urlMatch[1]);
  } else if (Array.isArray(content)) {
    for (const part of content) {
      candidates.push(part?.image_url?.url, part?.image_url, part?.inline_data?.data && `data:${part.inline_data.mime_type || 'image/png'};base64,${part.inline_data.data}`);
    }
  }
  return candidates.find((value) => typeof value === 'string' && (value.startsWith('https://') || /^data:image\/(?:png|jpeg|webp);base64,/.test(value.replace(/\s/g, '')))) || null;
}

function removeConnectedBackground(data, width, height) {
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  const corners = [0, width - 1, (height - 1) * width, pixelCount - 1];
  const target = [0, 1, 2].map((channel) => Math.round(corners.reduce((sum, index) => sum + data[index * 4 + channel], 0) / 4));
  const backgroundLike = (index) => {
    const offset = index * 4;
    return data[offset + 3] < 16 || (
      Math.abs(data[offset] - target[0]) <= 42 &&
      Math.abs(data[offset + 1] - target[1]) <= 42 &&
      Math.abs(data[offset + 2] - target[2]) <= 42
    );
  };
  let head = 0;
  let tail = 0;
  const enqueue = (index) => {
    if (!visited[index] && backgroundLike(index)) {
      visited[index] = 1;
      queue[tail++] = index;
    }
  };
  for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y += 1) { enqueue(y * width); enqueue(y * width + width - 1); }
  while (head < tail) {
    const index = queue[head++];
    data[index * 4 + 3] = 0;
    const x = index % width;
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (index >= width) enqueue(index - width);
    if (index + width < pixelCount) enqueue(index + width);
  }
  return data;
}

async function normalizeOutput(dataUrl) {
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) throw new Error('Invalid generated image');
  const decoded = await sharp(parsed.bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  removeConnectedBackground(decoded.data, decoded.info.width, decoded.info.height);
  return sharp(decoded.data, { raw: decoded.info }).webp({ quality: 86, alphaQuality: 100 }).toBuffer();
}

async function generateCharacterHandler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  const apiKey = process.env.NEWAPI_API_KEY;
  if (!apiKey) return response.status(503).json({ error: 'Character generation is not configured' });

  const body = parseRequestBody(request.body);
  const step = body?.step;
  const model = DEFAULT_MODEL;
  const baseUrl = (process.env.NEWAPI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

  // STEP 1: Build the upstream request for the frontend to execute
  if (step === 'build') {
    const portrait = parseImageDataUrl(body?.imageDataUrl);
    if (!portrait) return response.status(400).json({ error: 'Invalid portrait' });
    const peopleCount = typeof body?.peopleCount === 'number' ? body.peopleCount : 1;
    const personProfiles = Array.isArray(body?.personProfiles) ? body.personProfiles : [];
    const subjectType = body?.subjectType === 'object' ? 'object' : 'person';
    
    return response.status(200).json({
      upstreamUrl: `${baseUrl}/v1/chat/completions`,
      upstreamHeaders: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      upstreamBody: buildUpstreamPayload(portrait, model, peopleCount, personProfiles, subjectType)
    });
  }

  // STEP 2: Process the upstream payload fetched by the frontend
  if (step === 'process') {
    const payload = body?.upstreamPayload;
    let generated = findGeneratedDataUrl(payload);
    if (!generated) {
      console.error('Failed to find image in API response:', JSON.stringify(payload).substring(0, 500));
      return response.status(502).json({ error: 'API返回结果中没有图片 (内容可能被截断或模型拒绝生成)' });
    }
    
    if (generated.startsWith('https://')) {
      try {
        const imgRes = await fetch(generated);
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = imgRes.headers.get('content-type') || 'image/png';
        generated = `data:${mimeType};base64,${buffer.toString('base64')}`;
      } catch (err) {
        console.error('Failed to download image URL:', err);
        return response.status(502).json({ error: '无法下载模型生成的图片' });
      }
    }

    try {
      const output = await normalizeOutput(generated);
      response.setHeader('Cache-Control', 'no-store');
      return response.status(200).json({ imageDataUrl: `data:image/webp;base64,${output.toString('base64')}`, model });
    } catch (err) {
      console.error('Failed to normalize output:', err);
      return response.status(500).json({ error: '图片处理失败' });
    }
  }

  // Fallback (shouldn't be reached by new frontend)
  return response.status(400).json({ error: 'Invalid step' });
}

generateCharacterHandler._private = { buildPrompt, buildUpstreamPayload, findGeneratedDataUrl, parseImageDataUrl, removeConnectedBackground };
module.exports = generateCharacterHandler;

