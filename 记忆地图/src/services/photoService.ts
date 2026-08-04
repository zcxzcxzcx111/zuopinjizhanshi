import { Photo, PhotoLocation, PersonProfile } from '../types';
import { reverseGeocode as amapReverseGeocode } from './amapService';
import { persistPhotoAsset } from './photoStorage';
import { generateCharacterSticker } from './characterGeneration';
import { uploadToCOS } from './cos';

export interface PickedPhotoData {
  uri: string;
  width: number;
  height: number;
  lastModified?: number;
  capturedLocation?: PhotoLocation;
  isDemo?: boolean;
  exif?: {
    GPSLatitude?: number;
    GPSLongitude?: number;
    GPSLatitudeRef?: string;
    GPSLongitudeRef?: string;
    DateTimeOriginal?: string;
    DateTime?: string;
    [key: string]: any;
  };
}

// Request permissions and pick photos from gallery
export async function pickPhotos(): Promise<PickedPhotoData[]> {
  return pickPhotosWeb();
}

// Persistent input elements to prevent garbage collection and ensure mobile browser compatibility
let galleryInputRef: HTMLInputElement | null = null;
let cameraInputRef: HTMLInputElement | null = null;

// Web: use <input type="file"> to get original files with EXIF data
function pickPhotosWeb(): Promise<PickedPhotoData[]> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return resolve([]);
    
    if (!galleryInputRef) {
      galleryInputRef = document.createElement('input');
      galleryInputRef.type = 'file';
      galleryInputRef.accept = 'image/*';
      galleryInputRef.multiple = true;
      galleryInputRef.style.display = 'none';
      document.body.appendChild(galleryInputRef);
    }
    
    // Clear previous selection
    galleryInputRef.value = '';

    const handleChange = async () => {
      // Remove listener to prevent memory leaks if reused
      galleryInputRef?.removeEventListener('change', handleChange);
      try {
        const files = Array.from(galleryInputRef?.files || []);
        if (files.length === 0) { resolve([]); return; }

        const photos: PickedPhotoData[] = [];
        for (const file of files) {
          photos.push(await readWebFile(file));
        }
        resolve(photos);
      } catch (err) {
        console.error('[pickPhotosWeb] Error processing files:', err);
        reject(err);
      }
    };
    
    galleryInputRef.addEventListener('change', handleChange);
    galleryInputRef.click();
  });
}

async function readWebFile(file: File): Promise<PickedPhotoData> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  let exif: PickedPhotoData['exif'] = undefined;
  if (view.byteLength >= 4 && view.getUint16(0) === 0xFFD8) {
    exif = parseExifFromBuffer(view);
  }
  
  // Create object URL to load image for compression
  const blobUrl = URL.createObjectURL(file);
  const { blob, w, h } = await compressImage(blobUrl, 1920, 0.8);
  URL.revokeObjectURL(blobUrl);
  
  // Upload directly to Tencent Cloud COS
  const cosUrl = await uploadToCOS(blob, file.name);
  
  return { uri: cosUrl, width: w, height: h, lastModified: file.lastModified, exif };
}

function compressImage(blobUrl: string, maxDimension: number, quality: number): Promise<{ blob: Blob, w: number, h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > maxDimension || h > maxDimension) {
        const ratio = Math.min(maxDimension / w, maxDimension / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to uncompressed if canvas context fails
        fetch(blobUrl)
          .then(res => res.blob())
          .then(blob => resolve({ blob, w: img.naturalWidth, h: img.naturalHeight }))
          .catch(() => reject(new Error('Fallback fetch failed')));
        return;
      }
      
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((b) => {
        if (b) {
          resolve({ blob: b, w, h });
        } else {
          reject(new Error('Canvas toBlob failed'));
        }
      }, 'image/jpeg', quality);
    };
    img.onerror = () => reject(new Error('Image load failed for compression'));
    img.src = blobUrl;
  });
}

function getImageDimensions(uri: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = uri;
  });
}

// Take a photo with camera
export async function takePhoto(): Promise<PickedPhotoData | null> {
  return takePhotoWeb();
}

async function takePhotoWeb(): Promise<PickedPhotoData | null> {
  const file = await new Promise<File | null>((resolve) => {
    if (typeof document === 'undefined') return resolve(null);
    
    if (!cameraInputRef) {
      cameraInputRef = document.createElement('input');
      cameraInputRef.type = 'file';
      cameraInputRef.accept = 'image/*';
      cameraInputRef.capture = 'environment';
      cameraInputRef.style.display = 'none';
      document.body.appendChild(cameraInputRef);
    }
    
    cameraInputRef.value = '';
    
    const handleChange = () => {
      cameraInputRef?.removeEventListener('change', handleChange);
      resolve(cameraInputRef?.files?.[0] || null);
    };
    
    cameraInputRef.addEventListener('change', handleChange);
    cameraInputRef.click();
  });
  if (!file) return null;

  const picked = await readWebFile(file);
  const capturedLocation = await getCurrentLocation();
  return { ...picked, capturedLocation: capturedLocation || undefined };
}

// Convert EXIF GPS value to decimal degrees
function gpsToDecimal(value: any): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (Array.isArray(value)) {
    const [d, m, s] = value;
    return (d || 0) + (m || 0) / 60 + (s || 0) / 3600;
  }
  if (typeof value === 'object') {
    const d = value.degrees ?? value[0] ?? 0;
    const m = value.minutes ?? value[1] ?? 0;
    const s = value.seconds ?? value[2] ?? 0;
    return d + m / 60 + s / 3600;
  }
  return null;
}

// Extract GPS location from EXIF data
export function extractLocation(exif?: PickedPhotoData['exif']): PhotoLocation | null {
  if (!exif) return null;

  const lat = gpsToDecimal(exif.GPSLatitude);
  const lng = gpsToDecimal(exif.GPSLongitude);

  if (lat == null || lng == null) return null;

  let finalLat = lat;
  let finalLng = lng;
  if (exif.GPSLatitudeRef === 'S' || exif.GPSLatitudeRef === 'SOUTH') finalLat = -finalLat;
  if (exif.GPSLongitudeRef === 'W' || exif.GPSLongitudeRef === 'WEST') finalLng = -finalLng;

  if (isNaN(finalLat) || isNaN(finalLng) || finalLat < -90 || finalLat > 90 || finalLng < -180 || finalLng > 180) {
    return null;
  }

  return { latitude: finalLat, longitude: finalLng };
}

// Get current location using browser Geolocation API
export async function getCurrentLocation(): Promise<PhotoLocation | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}

// Extract date from EXIF or file metadata
export function extractDate(picked?: PickedPhotoData): string {
  const exif = picked?.exif;

  // 1. Try EXIF DateTimeOriginal / DateTime
  if (exif) {
    const dateStr = exif.DateTimeOriginal || exif.DateTime;
    if (dateStr) {
      const parts = dateStr.split(/[: ]/);
      if (parts.length >= 3) {
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
  }

  // 2. Fallback: file lastModified timestamp (usually photo taken date)
  if (picked?.lastModified) {
    const d = new Date(picked.lastModified);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 3. Last resort: today
  return new Date().toISOString().split('T')[0];
}

function generateId(): string {
  return `photo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function processPickedPhoto(
  picked: PickedPhotoData,
  manualLocation?: PhotoLocation,
  selectedPoints?: { x: number; y: number }[],
  selectedFaces?: { x: number; y: number; width: number; height: number }[],
  personProfiles?: Array<PersonProfile | null>,
  rawFaces?: any[]
): Promise<Photo> {
  // Priority: manualLocation > EXIF GPS from original photo. NO automatic random or hardcoded fallbacks!
  let location: PhotoLocation | null = null;

  if (manualLocation) {
    location = manualLocation;
  } else if (picked.capturedLocation) {
    location = picked.capturedLocation;
  } else {
    const exifLocation = extractLocation(picked.exif);
    if (exifLocation) {
      location = exifLocation;
    }
  }

  if (!location) {
    throw new Error('该照片原始 EXIF 属性中未找到 GPS 地理坐标数据。为保障打卡真实性，系统不会自动定位至特定坐标，请为照片手动选择实际拍摄位置。');
  }

  const date = extractDate(picked);
  const placeName = await reverseGeocode(location.latitude, location.longitude);
  const id = generateId();
  const uri = await persistPhotoAsset(picked.uri, id);
  let generationUri = picked.uri;
  let peopleCount = 1;
  let subjectType: 'person' | 'object' = 'person';
  
  if (!picked.isDemo) {
    if (selectedFaces && selectedFaces.length > 0) {
      generationUri = await cropImageByFaces(picked.uri, selectedFaces);
      peopleCount = selectedFaces.length;
      subjectType = 'person';
    } else if (selectedPoints && selectedPoints.length > 0) {
      generationUri = await cropImageByPoints(picked.uri, selectedPoints);
      peopleCount = 0; // Not used for objects, but keep safe default
      subjectType = 'object';
    } else {
      generationUri = picked.uri;
      peopleCount = 0;
      subjectType = 'object';
    }
  }

  return {
    id,
    uri,
    location: {
      ...location,
      placeName,
    },
    date,
    description: placeName || '未知地点',
    isDailyPick: false,
    
    // Setup for background sticker generation
    isGeneratingSticker: !picked.isDemo,
    generationUri: !picked.isDemo ? generationUri : undefined,
    peopleCount: !picked.isDemo ? peopleCount : undefined,
    subjectType: !picked.isDemo ? subjectType : undefined,
    personProfiles,
    rawFaces,
  };
}

// Reverse geocoding using Amap API
async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  try {
    const result = await amapReverseGeocode(lat, lng);
    return result?.placeName;
  } catch {
    return undefined;
  }
}

// Crop image based on exact face bounding boxes
async function cropImageByFaces(uri: string, faces: { x: number; y: number; width: number; height: number }[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(uri);

      // Find bounding box encompassing all selected faces
      let minX = 1, minY = 1, maxX = 0, maxY = 0;
      faces.forEach(f => {
        if (f.x < minX) minX = f.x;
        if (f.y < minY) minY = f.y;
        if (f.x + f.width > maxX) maxX = f.x + f.width;
        if (f.y + f.height > maxY) maxY = f.y + f.height;
      });

      // Add padding to include the body for half-body or full-body stickers
      const faceWidth = maxX - minX;
      const faceHeight = maxY - minY;
      
      const paddingLeft = 1.5 * faceWidth;
      const paddingRight = 1.5 * faceWidth;
      const paddingTop = 0.8 * faceHeight;
      const paddingBottom = 4.5 * faceHeight; // Extend down for the body
      
      minX = Math.max(0, minX - paddingLeft);
      maxX = Math.min(1, maxX + paddingRight);
      minY = Math.max(0, minY - paddingTop);
      maxY = Math.min(1, maxY + paddingBottom);

      const sx = minX * img.naturalWidth;
      const sy = minY * img.naturalHeight;
      const sw = (maxX - minX) * img.naturalWidth;
      const sh = (maxY - minY) * img.naturalHeight;

      // Limit max dimension to avoid generating huge base64 strings that crash the API
      const MAX_DIMENSION = 1024;
      let outW = sw;
      let outH = sh;
      if (outW > MAX_DIMENSION || outH > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / outW, MAX_DIMENSION / outH);
        outW *= ratio;
        outH *= ratio;
      }

      canvas.width = outW;
      canvas.height = outH;
      
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => resolve(uri);
    img.src = uri;
  });
}

// Crop image based on selected points (fallback)
async function cropImageByPoints(uri: string, points: { x: number; y: number }[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(uri);

      // Find bounding box of selected points (points are in relative coordinates 0-1)
      let minX = 1, minY = 1, maxX = 0, maxY = 0;
      points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });

      // Add padding (e.g., 20% around the bounding box)
      const paddingX = 0.2;
      const paddingY = 0.2;
      
      minX = Math.max(0, minX - paddingX);
      maxX = Math.min(1, maxX + paddingX);
      minY = Math.max(0, minY - paddingY);
      maxY = Math.min(1, Math.max(minY + 0.1, maxY + paddingY)); // Ensure some height

      const sx = minX * img.naturalWidth;
      const sy = minY * img.naturalHeight;
      const sw = (maxX - minX) * img.naturalWidth;
      const sh = (maxY - minY) * img.naturalHeight;

      // Limit max dimension
      const MAX_DIMENSION = 1024;
      let outW = sw;
      let outH = sh;
      if (outW > MAX_DIMENSION || outH > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / outW, MAX_DIMENSION / outH);
        outW *= ratio;
        outH *= ratio;
      }

      canvas.width = outW;
      canvas.height = outH;
      
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => resolve(uri);
    img.src = uri;
  });
}

// ==================== EXIF Binary Parser ====================

function parseExifFromBuffer(view: DataView): PickedPhotoData['exif'] | undefined {
  try {
    let offset = 2;
    while (offset < view.byteLength - 4) {
      if (view.getUint8(offset) !== 0xFF) break;
      const marker = view.getUint8(offset + 1);

      if (marker === 0xE1) {
        return parseExifSegment(view, offset);
      }

      if (marker === 0xDA) break;
      if (marker >= 0xD0 && marker <= 0xD8) {
        offset += 2;
      } else {
        if (offset + 4 > view.byteLength) break;
        const segLen = view.getUint16(offset + 2);
        if (segLen < 2) break;
        offset += 2 + segLen;
      }
    }
  } catch {}
  return undefined;
}

function parseExifSegment(view: DataView, offset: number): PickedPhotoData['exif'] | undefined {
  try {
    const segLen = view.getUint16(offset + 2);
    const segEnd = offset + 2 + segLen;
    let pos = offset + 4;

    const header = String.fromCharCode(view.getUint8(pos), view.getUint8(pos + 1), view.getUint8(pos + 2), view.getUint8(pos + 3));
    if (header !== 'Exif') return undefined;
    pos += 6;

    const tiffBase = pos; // TIFF header start, all IFD offsets are relative to this
    const le = view.getUint16(pos) === 0x4949;
    pos += 8;

    const result: any = {};
    readIFD(view, pos, le, segEnd, tiffBase, result, false);

    if (result._gpsOffset) {
      const gps: any = {};
      readIFD(view, tiffBase + result._gpsOffset, le, segEnd, tiffBase, gps, true);
      if (gps._lat && gps._lng) {
        result.GPSLatitude = gps._lat;
        result.GPSLongitude = gps._lng;
        result.GPSLatitudeRef = gps._latRef || 'N';
        result.GPSLongitudeRef = gps._lngRef || 'E';
      }
      delete result._gpsOffset;
    }

    return Object.keys(result).length > 0 ? result : undefined;
  } catch {
    return undefined;
  }
}

function readIFD(view: DataView, ifdPos: number, le: boolean, segEnd: number, tiffBase: number, result: any, isGps: boolean) {
  if (ifdPos + 2 > segEnd) return;
  const count = view.getUint16(ifdPos, le);

  for (let i = 0; i < count && ifdPos + 2 + (i + 1) * 12 <= segEnd; i++) {
    const entry = ifdPos + 2 + i * 12;
    const tag = view.getUint16(entry, le);
    const tagCount = view.getUint32(entry + 4, le);

    if (!isGps) {
      if (tag === 0x8825) {
        result._gpsOffset = view.getUint32(entry + 8, le);
      } else if (tag === 0x9003) {
        result.DateTimeOriginal = readAscii(view, entry + 8, tagCount, segEnd, tiffBase);
      } else if (tag === 0x0132) {
        result.DateTime = readAscii(view, entry + 8, tagCount, segEnd, tiffBase);
      }
    } else {
      if (tag === 1) {
        result._latRef = String.fromCharCode(view.getUint8(entry + 8));
      } else if (tag === 2) {
        result._lat = readRationals(view, entry, le, segEnd, tiffBase);
      } else if (tag === 3) {
        result._lngRef = String.fromCharCode(view.getUint8(entry + 8));
      } else if (tag === 4) {
        result._lng = readRationals(view, entry, le, segEnd, tiffBase);
      }
    }
  }
}

function readRationals(view: DataView, entry: number, le: boolean, segEnd: number, tiffBase: number): number[] | undefined {
  const tagCount = view.getUint32(entry + 4, le);
  if (tagCount !== 3) return undefined;

  let dataOffset = tiffBase + view.getUint32(entry + 8, le);
  if (dataOffset + 24 > segEnd) return undefined;

  const result: number[] = [];
  for (let i = 0; i < 3; i++) {
    const num = view.getUint32(dataOffset + i * 8, le);
    const den = view.getUint32(dataOffset + i * 8 + 4, le);
    result.push(den ? num / den : 0);
  }
  return result;
}

function readAscii(view: DataView, valuePos: number, count: number, segEnd: number, tiffBase: number): string | undefined {
  let strPos: number;
  if (count <= 4) {
    strPos = valuePos;
  } else {
    strPos = tiffBase + view.getUint32(valuePos, true);
  }
  if (strPos + count > segEnd) return undefined;
  let str = '';
  for (let i = 0; i < count - 1; i++) {
    str += String.fromCharCode(view.getUint8(strPos + i));
  }
  return str;
}
