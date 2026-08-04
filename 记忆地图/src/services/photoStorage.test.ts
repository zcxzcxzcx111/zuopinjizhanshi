import { describe, expect, it } from 'vitest';
import { decodePhotoEnvelope, encodePhotoEnvelope } from './photoStorageCodec';

describe('photo storage envelope', () => {
  it('round trips version one records', () => {
    expect(decodePhotoEnvelope(encodePhotoEnvelope([]))).toEqual([]);
  });

  it('rejects unsupported versions', () => {
    expect(decodePhotoEnvelope('{"version":99,"photos":[]}')).toEqual([]);
  });

  it('recovers from malformed data', () => {
    expect(decodePhotoEnvelope('not-json')).toEqual([]);
  });
});
