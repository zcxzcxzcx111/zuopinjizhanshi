import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const handler = require('./reverse-geocode.js');

function createResponse() {
  const state = { status: 200, body: null, headers: {} };
  return {
    state,
    setHeader(name, value) {
      state.headers[name] = value;
    },
    status(code) {
      state.status = code;
      return this;
    },
    json(body) {
      state.body = body;
      return this;
    },
  };
}

describe('reverse geocode API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.AMAP_WEB_SERVICE_KEY;
  });

  it('allows GET only', async () => {
    const response = createResponse();
    await handler({ method: 'POST', query: {} }, response);
    expect(response.state.status).toBe(405);
    expect(response.state.headers.Allow).toBe('GET');
  });

  it('rejects invalid coordinates before calling the provider', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponse();
    await handler({ method: 'GET', query: { lat: '91', lng: '120' } }, response);
    expect(response.state.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not call the provider without a server-side key', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = createResponse();
    await handler({ method: 'GET', query: { lat: '30', lng: '120' } }, response);
    expect(response.state.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
