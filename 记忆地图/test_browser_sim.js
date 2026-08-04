/**
 * Simulate exactly what the new browser code does:
 * 1. Call /api/generate-character?step=build (local)   -- we simulate this inline
 * 2. Call upstream API directly                         -- we do this
 * 3. Parse response as text -> JSON                     -- we do this
 * 4. Call /api/generate-character?step=process         -- we simulate this inline
 */
const fetch = require('node-fetch');
const path = require('path');
const sharp = require('sharp');
const { readFileSync } = require('fs');

// ---- inline the backend helpers ----
function parseImageDataUrl(value) {
  if (typeof value !== 'string') return null;
  const cleanValue = value.replace(/\s/g, '');
  const match = cleanValue.match(/^data:(.*?);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) { console.error('parseImageDataUrl failed. Prefix:', cleanValue.substring(0, 100)); return null; }
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0) return null;
  return { bytes, mimeType: match[1] };
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
      candidates.push(`data:${mime};base64,${cleanContent}`);
    }
    const urlMatch = content.match(/!\[.*?\]\((https:\/\/[^\)]+)\)/);
    if (urlMatch) candidates.push(urlMatch[1]);
  } else if (Array.isArray(content)) {
    for (const part of content) {
      candidates.push(
        part?.image_url?.url,
        part?.image_url,
        part?.inline_data?.data && `data:${part.inline_data.mime_type || 'image/png'};base64,${part.inline_data.data}`
      );
    }
  }
  return candidates.find(v => typeof v === 'string' && (v.startsWith('https://') || /^data:image\/(?:png|jpeg|webp);base64,/.test(v.replace(/\s/g, '')))) || null;
}

async function removeConnectedBackground(data, width, height) {
  // simplified - just return data as-is for test
  return data;
}

async function normalizeOutput(dataUrl) {
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) throw new Error('Invalid generated image');
  const decoded = await sharp(parsed.bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return sharp(decoded.data, { raw: decoded.info }).webp({ quality: 86, alphaQuality: 100 }).toBuffer();
}
// ---- end of inline backend ----

async function simulateBrowserFlow() {
  console.log('=== Simulating new browser flow ===\n');

  const API_KEY = 'sk-EtvNysI8Ra80twn5od4WsU02pnWHLU6pl0f97tEgFefIqSyX';
  const BASE_URL = 'https://new.suxi.ai';
  
  // Load a real test image from style-references
  const imgPath = path.join(__dirname, 'api', 'style-references', 'style-sheet.jpg');
  const imgB64 = readFileSync(imgPath).toString('base64');
  const testImageDataUrl = `data:image/jpeg;base64,${imgB64}`;
  
  const upstreamBody = {
    model: 'gemini-3.1-flash-image',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Create a cute chibi sticker of a person on pure white background. Rounded head, big eyes.' },
        { type: 'image_url', image_url: { url: testImageDataUrl } },
      ]
    }],
    stream: false
  };

  // STEP 2 (browser): fetch upstream directly
  console.log('STEP 2: Browser calls upstream API...');
  const start = Date.now();
  const upstreamResponse = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify(upstreamBody)
  });

  console.log(`Status: ${upstreamResponse.status}, elapsed: ${Date.now() - start}ms`);
  if (!upstreamResponse.ok) {
    console.error('Upstream failed:', await upstreamResponse.text());
    return;
  }

  // New browser code: read as text, parse as JSON
  const responseText = await upstreamResponse.text();
  console.log(`Response length: ${responseText.length}`);
  
  let upstreamPayload;
  try {
    upstreamPayload = JSON.parse(responseText);
    console.log('✅ Parsed as JSON');
  } catch (e) {
    console.log('Parsing as SSE fallback...');
    const lines = responseText.split('\n');
    let combined = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
        try { const d = JSON.parse(trimmed.slice(6)); if (d?.choices?.[0]?.delta?.content) combined += d.choices[0].delta.content; } catch (_) {}
      }
    }
    upstreamPayload = { choices: [{ message: { content: combined } }] };
    console.log('SSE combined content length:', combined.length);
  }

  // STEP 3 (browser->backend): extract and normalize
  console.log('\nSTEP 3: Backend processing...');
  const generated = findGeneratedDataUrl(upstreamPayload);
  if (!generated) {
    console.error('❌ findGeneratedDataUrl returned null!');
    console.log('Payload sample:', JSON.stringify(upstreamPayload).substring(0, 300));
    return;
  }
  console.log('✅ Found image:', generated.substring(0, 60), '...');

  try {
    const output = await normalizeOutput(generated);
    console.log(`\n✅ FULL PIPELINE SUCCESS! WebP output: ${output.length} bytes`);
    console.log(`Total time: ${Date.now() - start}ms`);
  } catch (err) {
    console.error('❌ normalizeOutput failed:', err.message);
  }
}

simulateBrowserFlow();
