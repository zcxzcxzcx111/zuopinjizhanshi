/**
 * End-to-end local test: calls upstream API, extracts image, runs through normalizeOutput
 * Run: node test_e2e.js
 */
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Inline the backend logic to test it locally
const sharp = require('sharp');

function parseImageDataUrl(value) {
  if (typeof value !== 'string') return null;
  const cleanValue = value.replace(/\s/g, '');
  const match = cleanValue.match(/^data:(.*?);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    console.error('parseImageDataUrl failed. Prefix:', cleanValue.substring(0, 80));
    return null;
  }
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
      else if (cleanContent.startsWith('R0lGOD')) mime = 'image/gif';
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

async function main() {
  console.log('=== E2E Test: gemini-3.1-flash-image sticker generation ===\n');
  
  const API_KEY = 'sk-EtvNysI8Ra80twn5od4WsU02pnWHLU6pl0f97tEgFefIqSyX';
  const BASE_URL = 'https://new.suxi.ai';
  
  // Use a small test image (1x1 red pixel JPEG as base64)
  const testImageB64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=';
  const testImageDataUrl = `data:image/jpeg;base64,${testImageB64}`;
  
  // Simple prompt for testing
  const prompt = 'Create a cute chibi sticker character on pure white background. Style: rounded head, big eyes, simple outfit.';

  console.log('Step 1: Calling upstream API (stream: false)...');
  const start = Date.now();
  
  const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gemini-3.1-flash-image',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: testImageDataUrl } },
        ]
      }],
      stream: false
    })
  });

  console.log(`Response status: ${res.status}, elapsed: ${Date.now() - start}ms`);

  const responseText = await res.text();
  console.log(`Response body length: ${responseText.length}`);
  console.log('First 500 chars:', responseText.substring(0, 500));

  // Try parse as JSON
  let payload = null;
  try {
    payload = JSON.parse(responseText);
    console.log('\nParsed as JSON successfully!');
    const msgContent = payload?.choices?.[0]?.message?.content;
    console.log('content type:', typeof msgContent);
    if (typeof msgContent === 'string') {
      console.log('content length:', msgContent.length);
      console.log('content prefix (no-whitespace):', msgContent.replace(/\s/g, '').substring(0, 100));
    } else if (Array.isArray(msgContent)) {
      console.log('content is array, length:', msgContent.length);
      msgContent.forEach((part, i) => console.log(`  [${i}] type:${part?.type}, keys:`, Object.keys(part)));
    }
  } catch (e) {
    console.log('\nJSON parse failed, trying SSE...');
    const lines = responseText.split('\n');
    let combined = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
        try {
          const data = JSON.parse(trimmed.slice(6));
          const delta = data?.choices?.[0]?.delta?.content;
          if (delta) combined += delta;
        } catch (_) {}
      }
    }
    payload = { choices: [{ message: { content: combined } }] };
    console.log('Extracted SSE content length:', combined.length);
  }

  console.log('\nStep 2: Extracting image from payload...');
  const dataUrl = findGeneratedDataUrl(payload);
  
  if (!dataUrl) {
    console.error('ERROR: No image found in payload!');
    console.log('Full payload:', JSON.stringify(payload).substring(0, 1000));
    process.exit(1);
  }
  
  console.log('Found image! DataUrl prefix:', dataUrl.substring(0, 60), '...');
  console.log('DataUrl length:', dataUrl.length);

  console.log('\nStep 3: Parsing image data...');
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) {
    console.error('ERROR: parseImageDataUrl failed!');
    process.exit(1);
  }
  console.log(`Parsed OK: ${parsed.mimeType}, ${parsed.bytes.length} bytes`);

  console.log('\nStep 4: Processing with sharp...');
  try {
    const decoded = await sharp(parsed.bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    console.log(`Decoded: ${decoded.info.width}x${decoded.info.height}`);
    const output = await sharp(decoded.data, { raw: decoded.info }).webp({ quality: 86, alphaQuality: 100 }).toBuffer();
    const outPath = path.join(__dirname, 'test_output.webp');
    fs.writeFileSync(outPath, output);
    console.log(`\n✅ SUCCESS! Output saved to: ${outPath} (${output.length} bytes)`);
    console.log(`Total elapsed: ${Date.now() - start}ms`);
  } catch (err) {
    console.error('ERROR: sharp processing failed:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
