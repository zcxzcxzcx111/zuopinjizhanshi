export interface AmapRegeocodeResult {
  address: string;
  placeName: string;
  adCode: string;
  city: string;
  district: string;
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180;
}

/**
 * 通过服务端代理进行逆地理编码，避免把高德 Web 服务 Key 打进客户端。
 */
export async function reverseGeocode(lat: number, lng: number): Promise<AmapRegeocodeResult | null> {
  if (!isValidCoordinate(lat, lng)) return null;

  const proxyUrl = '/api/reverse-geocode';

  const separator = proxyUrl.includes('?') ? '&' : '?';
  const url = `${proxyUrl}${separator}lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;

    const result = await response.json() as Partial<AmapRegeocodeResult>;
    if (typeof result.address !== 'string' || typeof result.placeName !== 'string') {
      return null;
    }

    return {
      address: result.address,
      placeName: result.placeName,
      adCode: typeof result.adCode === 'string' ? result.adCode : '',
      city: typeof result.city === 'string' ? result.city : '',
      district: typeof result.district === 'string' ? result.district : '',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function batchReverseGeocode(
  items: Array<{ id: string; lat: number; lng: number }>
): Promise<Map<string, AmapRegeocodeResult>> {
  const results = new Map<string, AmapRegeocodeResult>();

  for (const item of items) {
    const result = await reverseGeocode(item.lat, item.lng);
    if (result) results.set(item.id, result);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return results;
}
