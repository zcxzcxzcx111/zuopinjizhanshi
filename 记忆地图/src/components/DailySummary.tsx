import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DayStory } from '../types';
import { colors, typography, spacing, radius } from '../theme/appleTheme';
import PhotoAssetImage from './PhotoAssetImage';

interface DailySummaryProps {
  story: DayStory;
  onPress: (photoId?: string) => void;
}

const DailySummary = React.memo(function DailySummary({ story, onPress }: DailySummaryProps) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${month}月${day}日 ${weekdays[d.getDay()]}`;
  };

  const dailyPickPhoto = story.dailyPickPhoto;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(dailyPickPhoto?.id)}
      activeOpacity={0.8}
    >
      {dailyPickPhoto && (
        <PhotoAssetImage photo={dailyPickPhoto} style={styles.image} resizeMode="cover" />
      )}
      <View style={styles.content}>
        <View style={styles.dateRow}>
          <Text style={styles.date}>{formatDate(story.date)}</Text>
          <Text style={styles.stats}>{story.markers.length} 个地点</Text>
        </View>
        <Text style={styles.summary}>{story.summary}</Text>
        <Text style={styles.stats}>
          {story.markers.length} 个地点 · {story.markers.reduce((acc, m) => acc + m.photos.length, 0)} 张照片
        </Text>
        <Text style={styles.mapHint}>点击照片，在地图上查看位置</Text>
      </View>
    </TouchableOpacity>
  );
});

export default DailySummary;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 24, // increased radius for a more premium look
    marginHorizontal: spacing.xl,
    marginVertical: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)', // softer border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4, // for android
  },
  image: { 
    width: '100%', 
    aspectRatio: 1, // perfect square for better visual balance
  },
  content: { 
    padding: spacing.xl,
  },
  dateRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  date: { 
    ...typography.title2, 
    color: colors.textPrimary,
    fontWeight: '700',
  },
  summary: {
    ...typography.subhead, 
    color: colors.textSecondary,
    lineHeight: 22, 
    marginBottom: spacing.md,
  },
  stats: { 
    ...typography.caption1, 
    color: colors.textTertiary,
    fontWeight: '500',
  },
  mapHint: { 
    ...typography.subhead, 
    color: colors.accent, 
    marginTop: spacing.md,
    fontWeight: '600',
  },
});
