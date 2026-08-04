import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { SceneMarker, Photo, DayStory } from '../types';
import { colors, typography, spacing, radius, stickerShadow } from '../theme/appleTheme';
import { triggerLightHaptic } from '../utils/haptics';
import PhotoAssetImage from '../components/PhotoAssetImage';
import {
  minimalistColors,
  minimalistRadii,
  minimalistShadows,
  minimalistTypography,
} from '../theme/minimalistTheme';

interface CalendarScreenProps {
  photos: Photo[];
  dayStories: DayStory[];
  onNavigateToMap: (photoId?: string) => void;
  onNavigateToMapDate?: (dateStr: string) => void;
  onOpenUploader?: () => void;
  isEmbedded?: boolean;
}

const { width } = Dimensions.get('window');
const DAY_GAP = 4;
const DAY_WIDTH = (width - 32 - (DAY_GAP * 6)) / 7;

export default function CalendarScreen({
  photos,
  dayStories,
  onNavigateToMap,
  onNavigateToMapDate,
  onOpenUploader,
  isEmbedded = false,
}: CalendarScreenProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Group photos by date string (YYYY-MM-DD)
  const photosByDate = useMemo(() => {
    const map: Record<string, Photo[]> = {};
    photos.forEach((photo) => {
      const date = new Date(photo.date || Date.now());
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!map[dateStr]) {
        map[dateStr] = [];
      }
      map[dateStr].push(photo);
    });
    return map;
  }, [photos]);

  const renderCalendarGrid = () => {
    const days = [];
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    // Weekday headers
    const headers = weekDays.map((day, index) => (
      <View key={`header-${index}`} style={[styles.dayHeaderCell, index < 6 && { marginRight: DAY_GAP }]}>
        <Text style={styles.dayHeaderText}>{day}</Text>
      </View>
    ));

    // Empty cells before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      const isLastInRow = i % 7 === 6;
      days.push(<View key={`empty-${i}`} style={[
        styles.dayCell, 
        { backgroundColor: 'transparent', borderWidth: 0 },
        !isLastInRow && { marginRight: DAY_GAP }
      ]} />);
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const hasPhotos = !!photosByDate[dateStr] && photosByDate[dateStr].length > 0;
      const isSelected = dateStr === selectedDateStr;
      const isToday = dateStr === todayStr;

      const cellIndex = firstDayOfMonth + i - 1;
      const isLastInRow = cellIndex % 7 === 6;

      days.push(
        <TouchableOpacity
          key={`day-${i}`}
          style={[
            styles.dayCell,
            !isLastInRow && { marginRight: DAY_GAP },
            isSelected && styles.dayCellSelected,
            isToday && !isSelected && styles.dayCellToday,
          ]}
          onPress={() => {
            if (hasPhotos) {
              setSelectedDateStr(dateStr);
              setIsModalVisible(true);
            }
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.dayText,
              isSelected && styles.dayTextSelected,
              isToday && !isSelected && styles.dayTextToday,
            ]}
          >
            {i}
          </Text>
          {hasPhotos && (
            <View style={styles.thumbnailContainer}>
              {photosByDate[dateStr].slice(0, 3).map((photo, index, arr) => {
                const zIndex = arr.length - index;
                const offsetTop = index * 4;
                const offsetRight = index * -4;
                return (
                  <PhotoAssetImage
                    key={photo.id}
                    photo={photo}
                    style={[
                      styles.dayThumbnail,
                      { zIndex, top: offsetTop, right: offsetRight },
                    ]}
                    resizeMode="cover"
                    preferCharacter
                  />
                );
              })}
              {photosByDate[dateStr].length > 1 && (
                <View style={styles.thumbnailBadge}>
                  <Text style={styles.thumbnailBadgeText}>{photosByDate[dateStr].length}</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    }

    // Pad the end of the month with empty cells so flex-start layout is clean
    const remainingCells = 7 - (days.length % 7);
    if (remainingCells < 7) {
      for (let i = 0; i < remainingCells; i++) {
        const cellIndex = days.length;
        const isLastInRow = cellIndex % 7 === 6;
        days.push(<View key={`empty-end-${i}`} style={[
          styles.dayCell, 
          { backgroundColor: 'transparent', borderWidth: 0 },
          !isLastInRow && { marginRight: DAY_GAP }
        ]} />);
      }
    }

    return (
      <View style={styles.calendarGrid}>
        <View style={styles.weekHeaderRow}>{headers}</View>
        <View style={styles.daysGrid}>{days}</View>
      </View>
    );
  };

  const selectedDatePhotos = selectedDateStr ? photosByDate[selectedDateStr] : [];

  return (
    <View style={styles.container}>
      {/* Month Navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {currentYear}年{currentMonth + 1}月
        </Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarContainer}>
        {renderCalendarGrid()}
      </View>

      {/* Selected Date Overlay (Replacing Modal to prevent crashes) */}
      {isModalVisible && (
        <View style={[StyleSheet.absoluteFill, styles.modalOverlay, { zIndex: 999, elevation: 999 }]}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setIsModalVisible(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDateStr}</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.previewScrollContent,
                { paddingHorizontal: width * 0.1 }
              ]}
              pagingEnabled
              decelerationRate="fast"
              snapToInterval={width * 0.8 + 16}
            >
              {selectedDatePhotos.map((photo, index) => (
                <TouchableOpacity
                  key={photo.id}
                  style={[
                    styles.stickerCard, 
                    { width: width * 0.8 },
                    index === selectedDatePhotos.length - 1 && { marginRight: 0 }
                  ]}
                  onPress={() => {
                    setIsModalVisible(false);
                    onNavigateToMap(photo.id);
                  }}
                  activeOpacity={0.9}
                >
                  <PhotoAssetImage
                    photo={photo}
                    style={[styles.stickerImage, { height: width * 0.8 }]}
                    resizeMode="contain"
                    preferCharacter
                  />
                  <View style={styles.stickerInfo}>
                    <Text style={[styles.placeName, { fontSize: 16 }]} numberOfLines={1}>
                      {(photo as any).placeName || (photo as any).locationName || '未知地点'}
                    </Text>
                    {!!(photo as any).description && (
                      <Text style={[styles.description, { fontSize: 14 }]} numberOfLines={2}>
                        {(photo as any).description}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={[styles.mapJumpButton, { marginHorizontal: 24, marginBottom: 32 }]}
              onPress={() => {
                setIsModalVisible(false);
                onNavigateToMapDate?.(selectedDateStr || '');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.mapJumpButtonText}>📍 在地图上重温这一天</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: minimalistColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    ...minimalistTypography.title,
    color: minimalistColors.accent,
    fontSize: 24,
  },
  monthTitle: {
    ...minimalistTypography.headline,
    color: minimalistColors.textPrimary,
  },
  calendarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  calendarGrid: {
    width: '100%',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeaderCell: {
    width: DAY_WIDTH,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayHeaderText: {
    ...minimalistTypography.caption,
    color: minimalistColors.textSecondary,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: DAY_WIDTH,
    height: Math.max(DAY_WIDTH, 56),
    marginBottom: DAY_GAP + 4,
    borderRadius: minimalistRadii.md,
    backgroundColor: minimalistColors.surface,
    borderWidth: 1,
    borderColor: minimalistColors.border,
  },
  dayCellSelected: {
    backgroundColor: minimalistColors.background,
    borderWidth: 1,
    borderColor: minimalistColors.accent,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  dayText: {
    ...minimalistTypography.caption,
    color: minimalistColors.textPrimary,
    fontWeight: '500',
    position: 'absolute',
    top: 4,
    left: 4,
    fontSize: 12,
  },
  dayTextSelected: {
    color: minimalistColors.accent,
    fontWeight: 'bold',
  },
  dayTextToday: {
    color: minimalistColors.accent,
    fontWeight: 'bold',
  },
  thumbnailContainer: {
    position: 'absolute',
    top: 16,
    left: 6,
    right: 6,
    bottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayThumbnail: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFF',
    backgroundColor: '#FFF',
    position: 'absolute',
    ...minimalistShadows.card,
  },
  thumbnailBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: minimalistColors.accent,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  thumbnailBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: width,
    height: '75%',
    backgroundColor: minimalistColors.background,
    borderTopLeftRadius: minimalistRadii.xl,
    borderTopRightRadius: minimalistRadii.xl,
    position: 'absolute',
    bottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
  },
  modalTitle: {
    ...minimalistTypography.title,
    fontSize: 20,
  },
  modalCloseBtn: {
    padding: 8,
    backgroundColor: minimalistColors.surface,
    borderRadius: 16,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: minimalistColors.textSecondary,
  },
  previewScrollContent: {
    paddingBottom: 24,
  },
  stickerCard: {
    width: 120,
    marginRight: 16,
    backgroundColor: minimalistColors.surface,
    borderRadius: minimalistRadii.lg,
    ...minimalistShadows.card,
    overflow: 'hidden',
  },
  stickerImage: {
    width: '100%',
    height: 120,
    backgroundColor: minimalistColors.background,
  },
  stickerInfo: {
    padding: 12,
  },
  placeName: {
    ...minimalistTypography.subhead,
    color: minimalistColors.textPrimary,
    marginBottom: 4,
    fontWeight: '600',
  },
  description: {
    ...minimalistTypography.caption,
    color: minimalistColors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyStateText: {
    fontFamily: minimalistTypography.body.fontFamily,
    fontSize: 14,
    color: '#999',
  },
  mapJumpButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: minimalistColors.accent,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: minimalistColors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  mapJumpButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
