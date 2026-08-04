import type { Photo } from '../types';

const STORAGE_VERSION = 1;

interface PhotoStorageEnvelope {
  version: number;
  photos: Photo[];
}

export function encodePhotoEnvelope(photos: Photo[]): string {
  const envelope: PhotoStorageEnvelope = {
    version: STORAGE_VERSION,
    photos,
  };
  return JSON.stringify(envelope);
}

export function decodePhotoEnvelope(value: string | null | undefined): Photo[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as Partial<PhotoStorageEnvelope>;
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.photos)) {
      throw new Error('数据版本不匹配或格式错误');
    }
    return parsed.photos;
  } catch (error: any) {
    throw new Error('读取本地存储失败: ' + (error.message || '数据已损坏'));
  }
}
