
export interface LocationHint {
  name: string;
  lat: number;
  lng: number;
  radius: number; // km
  tag: string;
}

// 长三角及中国知名景点数据库
export const locationDatabase: LocationHint[] = [
  // === 杭州 ===
  { name: '西湖', lat: 30.2590, lng: 120.1306, radius: 3, tag: 'rowing' },
  { name: '灵隐寺', lat: 30.2400, lng: 120.1000, radius: 2, tag: 'hiking' },
  { name: '九溪烟树', lat: 30.2100, lng: 120.1100, radius: 2, tag: 'hiking' },
  { name: '龙井村', lat: 30.2200, lng: 120.0900, radius: 2, tag: 'park' },
  { name: '千岛湖', lat: 29.6000, lng: 118.9500, radius: 10, tag: 'rowing' },
  { name: '钱塘江', lat: 30.2400, lng: 120.2000, radius: 3, tag: 'travel' },
  { name: '宋城', lat: 30.1700, lng: 120.0800, radius: 2, tag: 'travel' },
  { name: '河坊街', lat: 30.2400, lng: 120.1700, radius: 1, tag: 'shopping' },

  // === 上海 ===
  { name: '外滩', lat: 31.2400, lng: 121.4900, radius: 1, tag: 'city' },
  { name: '南京路', lat: 31.2350, lng: 121.4750, radius: 1, tag: 'shopping' },
  { name: '陆家嘴', lat: 31.2400, lng: 121.5000, radius: 2, tag: 'city' },
  { name: '迪士尼', lat: 31.1433, lng: 121.6696, radius: 3, tag: 'travel' },
  { name: '田子坊', lat: 31.2100, lng: 121.4650, radius: 1, tag: 'travel' },
  { name: '城隍庙', lat: 31.2250, lng: 121.4900, radius: 1, tag: 'travel' },
  { name: '豫园', lat: 31.2270, lng: 121.4920, radius: 1, tag: 'park' },

  // === 苏州 ===
  { name: '拙政园', lat: 31.3250, lng: 120.6280, radius: 1, tag: 'park' },
  { name: '留园', lat: 31.3150, lng: 120.5930, radius: 1, tag: 'park' },
  { name: '虎丘', lat: 31.3300, lng: 120.5700, radius: 2, tag: 'hiking' },
  { name: '平江路', lat: 31.3180, lng: 120.6340, radius: 1, tag: 'travel' },
  { name: '周庄', lat: 31.1100, lng: 120.8500, radius: 3, tag: 'rowing' },
  { name: '金鸡湖', lat: 31.3200, lng: 120.7000, radius: 3, tag: 'rowing' },
  { name: '寒山寺', lat: 31.3100, lng: 120.5600, radius: 1, tag: 'travel' },

  // === 南京 ===
  { name: '中山陵', lat: 32.0600, lng: 118.8400, radius: 3, tag: 'hiking' },
  { name: '夫子庙', lat: 32.0200, lng: 118.7900, radius: 2, tag: 'travel' },
  { name: '玄武湖', lat: 32.0700, lng: 118.8000, radius: 2, tag: 'rowing' },
  { name: '明城墙', lat: 32.0400, lng: 118.8000, radius: 2, tag: 'hiking' },

  // === 其他知名景点 ===
  { name: '黄山', lat: 30.1300, lng: 118.1700, radius: 10, tag: 'hiking' },
  { name: '普陀山', lat: 30.0100, lng: 122.3800, radius: 5, tag: 'travel' },
  { name: '太湖', lat: 31.2000, lng: 120.2000, radius: 15, tag: 'rowing' },
  { name: '乌镇', lat: 30.7400, lng: 120.4900, radius: 3, tag: 'travel' },
  { name: '西塘', lat: 30.9400, lng: 120.8900, radius: 2, tag: 'travel' },
  { name: '莫干山', lat: 30.6300, lng: 119.8600, radius: 5, tag: 'hiking' },
  { name: '雁荡山', lat: 28.3700, lng: 121.0500, radius: 5, tag: 'hiking' },
  { name: '天目山', lat: 30.3300, lng: 119.4400, radius: 5, tag: 'hiking' },
  { name: '楠溪江', lat: 28.3500, lng: 120.6900, radius: 5, tag: 'rowing' },

  // 海边
  { name: '舟山海滩', lat: 29.9900, lng: 122.2100, radius: 5, tag: 'beach' },
  { name: '朱家尖', lat: 29.8800, lng: 122.4000, radius: 5, tag: 'beach' },
  { name: '三亚', lat: 18.2500, lng: 109.5000, radius: 20, tag: 'beach' },
  { name: '厦门', lat: 24.4800, lng: 118.0900, radius: 10, tag: 'beach' },
  { name: '青岛', lat: 36.0700, lng: 120.3800, radius: 10, tag: 'beach' },

  // 商业区 / 城市
  { name: '三里屯', lat: 39.9300, lng: 116.4500, radius: 2, tag: 'shopping' },
  { name: '王府井', lat: 39.9100, lng: 116.4100, radius: 1, tag: 'shopping' },
  { name: '国贸', lat: 39.9100, lng: 116.4600, radius: 2, tag: 'work' },
  { name: '西单', lat: 39.9100, lng: 116.3800, radius: 1, tag: 'shopping' },
  { name: '深圳万象城', lat: 22.5400, lng: 114.1100, radius: 2, tag: 'shopping' },
  { name: '广州天河城', lat: 23.1300, lng: 113.3200, radius: 2, tag: 'shopping' },

  // 办公区
  { name: '中关村', lat: 39.9800, lng: 116.3100, radius: 3, tag: 'work' },
  { name: '张江高科', lat: 31.2000, lng: 121.6000, radius: 3, tag: 'work' },
  { name: '深圳科技园', lat: 22.5400, lng: 113.9500, radius: 3, tag: 'work' },
];

// 计算两个坐标点之间的距离（km），使用 Haversine 公式
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // 地球半径 km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 根据 GPS 坐标查找最近的地点
export function findNearestLocation(lat: number, lng: number): LocationHint | null {
  let nearest: LocationHint | null = null;
  let minDist = Infinity;

  for (const hint of locationDatabase) {
    const dist = haversineDistance(lat, lng, hint.lat, hint.lng);
    if (dist <= hint.radius && dist < minDist) {
      minDist = dist;
      nearest = hint;
    }
  }

  return nearest;
}
