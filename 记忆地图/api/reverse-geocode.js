const AMAP_ENDPOINT = 'https://restapi.amap.com/v3/geocode/regeo';

function parseCoordinate(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function firstText(value) {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}

module.exports = async function reverseGeocodeHandler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const lat = parseCoordinate(request.query.lat, -90, 90);
  const lng = parseCoordinate(request.query.lng, -180, 180);
  if (lat === null || lng === null) {
    return response.status(400).json({ error: 'Invalid coordinates' });
  }

  const apiKey = process.env.AMAP_WEB_SERVICE_KEY;
  if (!apiKey) {
    return response.status(503).json({ error: 'Geocoding is not configured' });
  }

  const parameters = new URLSearchParams({
    key: apiKey,
    location: `${lng},${lat}`,
    radius: '1000',
    extensions: 'all',
    batch: 'false',
    roadlevel: '0',
  });

  try {
    const upstream = await fetch(`${AMAP_ENDPOINT}?${parameters.toString()}`);
    if (!upstream.ok) {
      return response.status(502).json({ error: 'Geocoding provider failed' });
    }

    const data = await upstream.json();
    if (data.status !== '1' || !data.regeocode) {
      return response.status(502).json({ error: 'Geocoding provider rejected the request' });
    }

    const regeocode = data.regeocode;
    const addressComponent = regeocode.addressComponent || {};
    const firstPoi = Array.isArray(regeocode.pois) ? regeocode.pois[0] : null;
    const placeName = firstText(firstPoi?.name)
      || firstText(addressComponent.neighborhood?.name)
      || firstText(addressComponent.building?.name)
      || firstText(addressComponent.township)
      || firstText(addressComponent.district)
      || firstText(addressComponent.city)
      || firstText(regeocode.formatted_address);

    response.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return response.status(200).json({
      address: firstText(regeocode.formatted_address),
      placeName,
      adCode: firstText(addressComponent.adcode),
      city: firstText(addressComponent.city),
      district: firstText(addressComponent.district),
    });
  } catch {
    return response.status(502).json({ error: 'Geocoding request failed' });
  }
};
