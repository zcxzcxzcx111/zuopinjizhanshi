import { Photo, SceneMarker, DayStory } from '../types';

// Mock photos with real Chinese city coordinates
export const mockPhotos: Photo[] = [
  // Day 1 - 杭州西湖
  {
    id: 'p1',
    uri: 'https://picsum.photos/seed/hangzhou1/400/300',
    location: { latitude: 30.2590, longitude: 120.1485, placeName: '西湖断桥', address: '杭州市西湖区' },
    date: '2025-05-10',
    tag: 'selfie',
    description: '在断桥拍了合影',
    isDailyPick: true,
  },
  {
    id: 'p2',
    uri: 'https://picsum.photos/seed/hangzhou2/400/300',
    location: { latitude: 30.2430, longitude: 120.1400, placeName: '西湖游船码头', address: '杭州市西湖区' },
    date: '2025-05-10',
    tag: 'rowing',
    description: '在西湖划船',
  },
  {
    id: 'p3',
    uri: 'https://picsum.photos/seed/hangzhou3/400/300',
    location: { latitude: 30.2500, longitude: 120.1600, placeName: '楼外楼', address: '杭州市西湖区孤山路' },
    date: '2025-05-10',
    tag: 'dining',
    description: '吃了西湖醋鱼',
  },

  // Day 2 - 杭州灵隐寺
  {
    id: 'p4',
    uri: 'https://picsum.photos/seed/hangzhou4/400/300',
    location: { latitude: 30.2400, longitude: 120.1000, placeName: '灵隐寺', address: '杭州市西湖区灵隐路' },
    date: '2025-05-11',
    tag: 'hiking',
    description: '爬了灵隐寺的山',
    isDailyPick: true,
  },
  {
    id: 'p5',
    uri: 'https://picsum.photos/seed/hangzhou5/400/300',
    location: { latitude: 30.2450, longitude: 120.1050, placeName: '飞来峰', address: '杭州市西湖区' },
    date: '2025-05-11',
    tag: 'hiking',
    description: '参观飞来峰石刻',
  },

  // Day 3 - 上海外滩
  {
    id: 'p6',
    uri: 'https://picsum.photos/seed/shanghai1/400/300',
    location: { latitude: 31.2400, longitude: 121.4900, placeName: '外滩', address: '上海市黄浦区' },
    date: '2025-05-12',
    tag: 'city',
    description: '夜游外滩',
    isDailyPick: true,
  },
  {
    id: 'p7',
    uri: 'https://picsum.photos/seed/shanghai2/400/300',
    location: { latitude: 31.2350, longitude: 121.4750, placeName: '南京路步行街', address: '上海市黄浦区' },
    date: '2025-05-12',
    tag: 'shopping',
    description: '逛了南京路',
  },
  {
    id: 'p8',
    uri: 'https://picsum.photos/seed/shanghai3/400/300',
    location: { latitude: 31.2380, longitude: 121.4920, placeName: '和平饭店', address: '上海市黄浦区' },
    date: '2025-05-12',
    tag: 'dining',
    description: '在和平饭店吃了晚餐',
  },

  // Day 4 - 上海迪士尼
  {
    id: 'p9',
    uri: 'https://picsum.photos/seed/shanghai4/400/300',
    location: { latitude: 31.1434, longitude: 121.6696, placeName: '上海迪士尼乐园', address: '上海市浦东新区' },
    date: '2025-05-13',
    tag: 'travel',
    description: '迪士尼一日游',
    isDailyPick: true,
  },
  {
    id: 'p10',
    uri: 'https://picsum.photos/seed/shanghai5/400/300',
    location: { latitude: 31.1440, longitude: 121.6700, placeName: '迪士尼城堡', address: '上海市浦东新区' },
    date: '2025-05-13',
    tag: 'selfie',
    description: '在城堡前合影',
  },

  // Day 5 - 苏州
  {
    id: 'p11',
    uri: 'https://picsum.photos/seed/suzhou1/400/300',
    location: { latitude: 31.3180, longitude: 120.6270, placeName: '拙政园', address: '苏州市姑苏区' },
    date: '2025-05-14',
    tag: 'park',
    description: '逛了拙政园',
    isDailyPick: true,
  },
  {
    id: 'p12',
    uri: 'https://picsum.photos/seed/suzhou2/400/300',
    location: { latitude: 31.3150, longitude: 120.6300, placeName: '平江路', address: '苏州市姑苏区' },
    date: '2025-05-14',
    tag: 'shopping',
    description: '在平江路买了丝绸',
  },
  {
    id: 'p13',
    uri: 'https://picsum.photos/seed/suzhou3/400/300',
    location: { latitude: 31.3100, longitude: 120.6250, placeName: '松鹤楼', address: '苏州市姑苏区' },
    date: '2025-05-14',
    tag: 'dining',
    description: '吃了松鼠桂鱼',
  },

  // Day 6 - 苏州周庄
  {
    id: 'p14',
    uri: 'https://picsum.photos/seed/suzhou4/400/300',
    location: { latitude: 31.1100, longitude: 120.8500, placeName: '周庄古镇', address: '苏州市昆山市' },
    date: '2025-05-15',
    tag: 'rowing',
    description: '在周庄坐了摇橹船',
    isDailyPick: true,
  },
  {
    id: 'p15',
    uri: 'https://picsum.photos/seed/suzhou5/400/300',
    location: { latitude: 31.1120, longitude: 120.8520, placeName: '周庄双桥', address: '苏州市昆山市' },
    date: '2025-05-15',
    tag: 'selfie',
    description: '双桥打卡',
  },
];

// Generate SceneMarkers from photos
export function generateSceneMarkers(photos: Photo[]): SceneMarker[] {
  const markerMap = new Map<string, SceneMarker>();

  photos.forEach((photo) => {
    const key = `${photo.location.latitude.toFixed(3)}-${photo.location.longitude.toFixed(3)}-${photo.date}`;
    if (markerMap.has(key)) {
      markerMap.get(key)!.photos.push(photo);
    } else {
      markerMap.set(key, {
        id: `marker-${photo.id}`,
        location: photo.location,
        tag: photo.tag,
        date: photo.date,
        description: photo.description,
        photos: [photo],
      });
    }
  });

  return Array.from(markerMap.values());
}

// Generate DayStories from photos
export function generateDayStories(photos: Photo[]): DayStory[] {
  const photosByDate = new Map<string, Photo[]>();

  photos.forEach((photo) => {
    const dayPhotos = photosByDate.get(photo.date) ?? [];
    dayPhotos.push(photo);
    photosByDate.set(photo.date, dayPhotos);
  });

  return Array.from(photosByDate.entries())
    .map(([date, dayPhotos]) => ({
      date,
      summary: generateDaySummary(date, dayPhotos),
      markers: generateSceneMarkers(dayPhotos),
      dailyPickPhoto: dayPhotos.find((photo) => photo.isDailyPick) ?? dayPhotos[0],
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function generateDaySummary(date: string, photos: Photo[]): string {
  const d = new Date(date);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[d.getDay()];
  const places = [...new Set(photos.map(p => p.location.placeName).filter(Boolean))];
  const placeText = places.length > 0 ? `在${places.slice(0, 3).join('、')}` : '';
  return `${weekday}，${placeText}，拍了 ${photos.length} 张照片`;
}

