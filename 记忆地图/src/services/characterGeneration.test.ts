import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseGeneratedCharacter, requestGeneratedCharacter } from './characterGeneration';

describe('character generation client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('parses a transparent WebP response', () => {
    expect(parseGeneratedCharacter({
      imageDataUrl: 'data:image/webp;base64,aW1hZ2U=',
      model: 'gpt-image-1.5',
    })).toEqual({
      imageDataUrl: 'data:image/webp;base64,aW1hZ2U=',
      model: 'gpt-image-1.5',
    });
  });

  it('rejects malformed image responses', () => {
    expect(() => parseGeneratedCharacter({ imageDataUrl: 'https://example.com/image.png' }))
      .toThrow('动漫人物生成结果无效');
  });

  it('posts the portrait and selected scene', async () => {
    const fetchMock = vi.fn(async (_url, options) => ({
      ok: true,
      json: async () => ({ imageDataUrl: 'data:image/webp;base64,aW1hZ2U=', model: 'gpt-image-1.5' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    await requestGeneratedCharacter('data:image/jpeg;base64,cGhvdG8=');
    expect(fetchMock).toHaveBeenCalledWith('/api/generate-character', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.imageDataUrl).toContain('data:image/jpeg;base64,');
  });

  it('uses the server error without discarding context', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Character generation is not configured' }),
    })));
    await expect(requestGeneratedCharacter('data:image/jpeg;base64,cGhvdG8='))
      .rejects.toThrow('Character generation is not configured');
  });
});
