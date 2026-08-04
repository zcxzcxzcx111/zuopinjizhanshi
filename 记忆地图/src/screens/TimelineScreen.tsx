import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import { Photo, DayStory, PersonProfile } from '../types';
import DailySummary from '../components/DailySummary';
import PhotoAssetImage from '../components/PhotoAssetImage';
import CalendarScreen from './CalendarScreen';
import { minimalistColors, minimalistRadii, minimalistShadows, minimalistTypography } from '../theme/minimalistTheme';
import { triggerLightHaptic } from '../utils/haptics';

interface TimelineScreenProps {
  photos: Photo[];
  dayStories: DayStory[];
  onNavigateToMap: (photoId?: string) => void;
  onNavigateToMapDate?: (dateStr: string) => void;
  onOpenUploader: () => void;
  resetKey?: number;
}

export default function TimelineScreen({
  photos,
  dayStories,
  onNavigateToMap,
  onNavigateToMapDate,
  onOpenUploader,
  resetKey,
}: TimelineScreenProps) {
  const totalPhotos = photos.length;
  const totalDays = dayStories.length;
  const totalPlaces = new Set(photos.map((p) => p?.location?.placeName).filter(Boolean)).size;
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [selectedProfileName, setSelectedProfileName] = useState<string | null>(null);
  const [viewState, setViewState] = useState<'timeline' | 'gallery'>('timeline');

  useEffect(() => {
    setViewState('timeline');
    setSelectedProfileName(null);
  }, [resetKey]);

  const handleProfileClick = (profileName: string | null) => {
    triggerLightHaptic();
    setSelectedProfileName(profileName);
    setViewState('gallery');
  };

  const uniqueProfiles = useMemo(() => {
    const map = new Map<string, PersonProfile>();
    for (const p of photos) {
      if (p.personProfiles) {
        for (const prof of p.personProfiles) {
          if (prof) {
            // Deduplicate by name to fix duplicate display issues
            const existing = map.get(prof.name);
            if (!existing || (!existing.baseCharacterUri && prof.baseCharacterUri)) {
              map.set(prof.name, prof);
            }
          }
        }
      }
    }
    return Array.from(map.values());
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    let filtered = photos;
    if (selectedProfileName) {
      filtered = photos.filter(p => p.personProfiles?.some(prof => prof?.name === selectedProfileName));
    }
    const unique = new Map<string, Photo>();
    for (const p of filtered) {
      if (!unique.has(p.id)) {
        unique.set(p.id, p);
      }
    }
    return Array.from(unique.values());
  }, [photos, selectedProfileName]);

  const filteredDayStories = useMemo(() => {
    if (!selectedProfileName) return dayStories;
    return dayStories.map(story => {
      const filteredMarkers = story.markers.map(marker => {
         const markerFilteredPhotos = marker.photos.filter(p => p.personProfiles?.some(prof => prof?.name === selectedProfileName));
         return { ...marker, photos: markerFilteredPhotos };
      }).filter(m => m.photos.length > 0);
      return { ...story, markers: filteredMarkers };
    }).filter(story => story.markers.length > 0);
  }, [dayStories, selectedProfileName]);

  const galleryPhotos = useMemo(() => {
    return [...filteredPhotos].sort((a, b) => {
      const tA = new Date(a.date || 0).getTime();
      const tB = new Date(b.date || 0).getTime();
      return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
    });
  }, [filteredPhotos]);

  const selectedProfile = selectedProfileName ? uniqueProfiles.find(p => p.name === selectedProfileName) : null;
  const headerTitle = selectedProfile ? selectedProfile.name : '所有人';

  // Empty state
  if (photos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.emptyContent}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>+</Text>
            </View>
            <Text style={styles.emptyTitle}>时光回忆</Text>
            <Text style={styles.emptySubtitle}>
              上传你的旅行照片，生成每日回忆故事
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => { triggerLightHaptic(); onOpenUploader(); }} activeOpacity={0.8}>
              <Text style={styles.emptyBtnText}>开始上传</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.contentPadding}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalDays}</Text>
          <Text style={styles.statLabel}>天</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalPhotos}</Text>
          <Text style={styles.statLabel}>张照片</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalPlaces}</Text>
          <Text style={styles.statLabel}>个地点</Text>
        </View>
      </View>

      {/* Top Actions Row */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity 
          style={styles.actionBtnSecondary} 
          onPress={() => { triggerLightHaptic(); setIsCalendarVisible(true); }}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnTextSecondary}>📅 日历面板</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionBtnPrimary} 
          onPress={() => { triggerLightHaptic(); onOpenUploader(); }} 
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnTextPrimary}>+ 添加更多照片</Text>
        </TouchableOpacity>
      </View>

      {/* Profiles Filter replacing Map Button */}
      {uniqueProfiles.length > 0 && (
        <View style={styles.profilesSection}>
          <Text style={styles.sectionTitle}>按人物筛选</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profilesScroll}>
            <TouchableOpacity 
              style={styles.profileItem} 
              onPress={() => handleProfileClick(null)}
            >
              <View style={[styles.profileAvatarPlaceholder, !selectedProfileName && styles.profileAvatarPlaceholderSelected]}>
                <Text style={[styles.profileAvatarText, !selectedProfileName && styles.profileAvatarTextSelected]}>全部</Text>
              </View>
              <Text style={[styles.profileName, !selectedProfileName && styles.profileNameSelected]}>所有人</Text>
            </TouchableOpacity>
            
            {uniqueProfiles.map(profile => (
              <TouchableOpacity 
                key={profile.name} 
                style={styles.profileItem}
                onPress={() => handleProfileClick(profile.name)}
              >
                {profile.baseCharacterUri ? (
                  <Image source={{ uri: profile.baseCharacterUri }} style={[styles.profileAvatar, selectedProfileName === profile.name && styles.profileAvatarSelected]} />
                ) : (
                  <View style={[styles.profileAvatarPlaceholder, selectedProfileName === profile.name && styles.profileAvatarPlaceholderSelected]}>
                    <Text style={[styles.profileAvatarText, selectedProfileName === profile.name && styles.profileAvatarTextSelected]}>
                      {profile.name.charAt(0)}
                    </Text>
                  </View>
                )}
                <Text style={[styles.profileName, selectedProfileName === profile.name && styles.profileNameSelected]} numberOfLines={1}>{profile.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

    </View>
  );

  if (viewState === 'gallery') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.galleryHeaderWrapper}>
          <View style={styles.galleryHeader}>
            <TouchableOpacity onPress={() => { triggerLightHaptic(); setViewState('timeline'); }} style={styles.backButton}>
              <Text style={styles.backButtonText}>{'<'} 返回</Text>
            </TouchableOpacity>
            <Text style={styles.galleryTitle}>{headerTitle}的贴纸</Text>
            <View style={{ width: 60 }} /> {/* balance layout */}
          </View>
        </SafeAreaView>

        <FlatList
          key="gallery-list"
          data={galleryPhotos}
          keyExtractor={(item, index) => item?.id || String(index)}
          numColumns={3}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={5}
          removeClippedSubviews={false}
          contentContainerStyle={styles.galleryGrid}
          renderItem={({ item }) => {
            if (!item) return null;
            return (
              <TouchableOpacity 
                style={styles.galleryGridItem} 
                onPress={() => { triggerLightHaptic(); onNavigateToMap(item.id); }}
              >
                <PhotoAssetImage
                  photo={item}
                  style={styles.galleryGridImage}
                  resizeMode="cover"
                  preferCharacter
                />
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sleek Minimalist Header */}
      <SafeAreaView style={styles.hudWrapper}>
        <View style={styles.hud}>
          <Text style={styles.hudTitle}>时光回忆</Text>
          <Text style={styles.hudSubtitle}>你的旅行足迹</Text>
        </View>
      </SafeAreaView>

      {/* Content */}
      <FlatList
        key="timeline-list"
        ListHeaderComponent={renderHeader}
        data={filteredDayStories}
        keyExtractor={(item, index) => item?.date || String(index)}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews={false}
        renderItem={({ item }) => {
          if (!item) return null;
          return <DailySummary story={item} onPress={onNavigateToMap} />;
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Calendar Overlay (Replacing Modal to prevent Safari crashes) */}
      {isCalendarVisible && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: minimalistColors.background, zIndex: 999, elevation: 999 }]}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { triggerLightHaptic(); setIsCalendarVisible(false); }} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕ 关闭日历面板</Text>
              </TouchableOpacity>
            </View>
            <CalendarScreen 
              photos={filteredPhotos} 
              dayStories={filteredDayStories} 
              onNavigateToMap={(id) => {
                setIsCalendarVisible(false);
                onNavigateToMap(id);
              }} 
              onNavigateToMapDate={(date) => {
                setIsCalendarVisible(false);
                if (onNavigateToMapDate) onNavigateToMapDate(date);
              }}
              onOpenUploader={() => {
                setIsCalendarVisible(false);
                onOpenUploader();
              }} 
              isEmbedded={true}
            />
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: minimalistColors.background },
  
  // Sleek Top HUD
  hudWrapper: {
    paddingTop: 10,
    paddingBottom: 20,
    alignItems: 'center',
    backgroundColor: minimalistColors.background,
    zIndex: 10,
  },
  hud: {
    alignItems: 'center',
  },
  hudTitle: { ...minimalistTypography.headline, color: minimalistColors.textPrimary },
  hudSubtitle: { ...minimalistTypography.caption, marginTop: 4 },

  contentPadding: {
    paddingHorizontal: 20,
  },

  statsRow: {
    flexDirection: 'row', gap: 12,
  },
  statCard: {
    flex: 1, backgroundColor: minimalistColors.surface, borderRadius: minimalistRadii.lg,
    paddingVertical: 20, alignItems: 'center',
    borderWidth: 1, borderColor: minimalistColors.border,
    ...minimalistShadows.card,
  },
  statNumber: { ...minimalistTypography.title, color: minimalistColors.textPrimary },
  statLabel: { ...minimalistTypography.caption, color: minimalistColors.textSecondary, marginTop: 4 },

  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12, // React Native Web supports gap
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: minimalistColors.textPrimary,
    paddingVertical: 14,
    borderRadius: minimalistRadii.round,
    alignItems: 'center',
    ...minimalistShadows.card,
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: minimalistColors.surface,
    paddingVertical: 14,
    borderRadius: minimalistRadii.round,
    borderWidth: 1,
    borderColor: minimalistColors.border,
    alignItems: 'center',
    ...minimalistShadows.card,
  },
  actionBtnTextPrimary: {
    ...minimalistTypography.subhead,
    color: '#FFF',
    fontWeight: '700',
  },
  actionBtnTextSecondary: {
    ...minimalistTypography.subhead,
    color: minimalistColors.textPrimary,
    fontWeight: '600',
  },
  
  profilesSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    ...minimalistTypography.subhead,
    color: minimalistColors.textSecondary,
    marginBottom: 12,
  },
  profilesScroll: {
    paddingRight: 20,
    gap: 16,
  },
  profileItem: {
    alignItems: 'center',
    width: 60,
  },
  profileItemSelected: {
    // Style when selected (handled conditionally on inner elements)
  },
  profileAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: minimalistColors.surface,
    borderWidth: 2, borderColor: 'transparent',
    marginBottom: 8,
  },
  profileAvatarSelected: {
    borderColor: minimalistColors.accent,
  },
  profileAvatarPlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: minimalistColors.surface,
    borderWidth: 2, borderColor: 'transparent',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  profileAvatarPlaceholderSelected: {
    borderColor: minimalistColors.accent,
    backgroundColor: minimalistColors.background,
  },
  profileAvatarText: {
    ...minimalistTypography.subhead, color: minimalistColors.textSecondary,
  },
  profileAvatarTextSelected: {
    color: minimalistColors.accent, fontWeight: '700',
  },
  profileName: {
    ...minimalistTypography.caption, color: minimalistColors.textSecondary,
    textAlign: 'center',
  },
  profileNameSelected: {
    color: minimalistColors.accent, fontWeight: '700',
  },
  
  // Gallery Styles
  galleryHeaderWrapper: {
    backgroundColor: minimalistColors.background,
    borderBottomWidth: 1,
    borderBottomColor: minimalistColors.border,
    zIndex: 10,
    paddingTop: 10,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    paddingVertical: 8,
    width: 60,
  },
  backButtonText: {
    ...minimalistTypography.subhead,
    color: minimalistColors.accent,
    fontWeight: '600',
  },
  galleryTitle: {
    ...minimalistTypography.title,
    color: minimalistColors.textPrimary,
  },
  galleryGrid: {
    padding: 8,
    paddingBottom: 40,
  },
  galleryGridItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    borderRadius: minimalistRadii.md,
    backgroundColor: minimalistColors.surface,
    borderWidth: 1,
    borderColor: minimalistColors.border,
    overflow: 'hidden',
    ...minimalistShadows.card,
  },
  galleryGridImage: {
    width: '100%',
    height: '100%',
  },

  listContent: { paddingBottom: 120 },

  // Modal Styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: minimalistColors.background,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: minimalistColors.border,
    backgroundColor: minimalistColors.background,
    alignItems: 'flex-end',
  },
  modalCloseBtn: {
    padding: 8,
  },
  modalCloseText: {
    ...minimalistTypography.subhead,
    color: minimalistColors.textSecondary,
    fontWeight: '600',
  },

  // Empty state matches MapScreen exactly
  emptyContainer: { flex: 1, backgroundColor: minimalistColors.background },
  safeArea: { flex: 1 },
  emptyContent: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: minimalistColors.surface,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1, borderColor: minimalistColors.border,
    ...minimalistShadows.card,
  },
  emptyIcon: { fontSize: 24, color: minimalistColors.textPrimary, fontWeight: '300' },
  emptyTitle: { ...minimalistTypography.title, color: minimalistColors.textPrimary, marginBottom: 8 },
  emptySubtitle: { ...minimalistTypography.body, color: minimalistColors.textSecondary, textAlign: 'center', marginBottom: 32 },
  emptyBtn: {
    backgroundColor: minimalistColors.accent, borderRadius: minimalistRadii.round,
    paddingHorizontal: 32, paddingVertical: 16,
    ...minimalistShadows.card,
  },
  emptyBtnText: { ...minimalistTypography.subhead, color: minimalistColors.textOnAccent, fontWeight: '600' },
});
