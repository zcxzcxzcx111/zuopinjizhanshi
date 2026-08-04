import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const handler = require('./generate-character.js');

function createResponse() {
  const state = { status: 200, body: null, headers: {} };
  return {
    state,
    setHeader(name, value) { state.headers[name] = value; },
    status(code) { state.status = code; return this; },
    json(body) { state.body = body; return this; },
  };
}

const portrait = `data:image/jpeg;base64,${Buffer.from('portrait').toString('base64')}`;

describe('character generation API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEWAPI_API_KEY;
    delete process.env.NEWAPI_BASE_URL;
    delete process.env.NEWAPI_IMAGE_MODEL;
  });

  it('allows POST only', async () => {
    const response = createResponse();
    await handler({ method: 'GET' }, response);
    expect(response.state.status).toBe(405);
    expect(response.state.headers.Allow).toBe('POST');
  });

  it('requires a server-side API key', async () => {
    const response = createResponse();
    await handler({ method: 'POST', body: { imageDataUrl: portrait } }, response);
    expect(response.state.status).toBe(503);
  });

  it('rejects malformed portraits', async () => {
    process.env.NEWAPI_API_KEY = 'test-key';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponse();
    await handler({ method: 'POST', body: { imageDataUrl: 'https://example.com/photo.jpg' } }, response);
    expect(response.state.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends identity first, three style references, and image output settings', async () => {
    process.env.NEWAPI_API_KEY = 'test-key';
    const onePixelPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const fetchMock = vi.fn(async (url, options) => {
      expect(url).toBe('https://new.suxi.ai/v1/chat/completions');
      const request = JSON.parse(options.body);
      expect(request.model).toBe('gemini-3.1-flash-image-preview');
      expect(request.modalities).toEqual(['text', 'image']);
      expect(request.image_config.aspect_ratio).toBe('1:1');
      const content = request.messages[0].content;
      expect(content.filter((part) => part.type === 'image_url')).toHaveLength(4);
      expect(content[1].image_url.url).toBe(portrait);
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: `![image](data:image/png;base64,${onePixelPng})` } }] }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponse();
    await handler({ method: 'POST', body: { imageDataUrl: portrait } }, response);
    expect(response.state.status).toBe(200);
    expect(response.state.body.imageDataUrl).toMatch(/^data:image\/webp;base64,/);
    expect(response.state.body.model).toBe('gemini-3.1-flash-image-preview');
  });

  it('keeps reference identities, text, and backgrounds out of the prompt', () => {
    const prompt = handler._private.buildPrompt();
    expect(prompt).toContain('identity, pose, and framing source');
    expect(prompt).toContain('style-only references');
    expect(prompt).toContain('truly transparent');
    expect(prompt).toContain('no texture');
    expect(prompt).toContain('watermark');
  });
});
