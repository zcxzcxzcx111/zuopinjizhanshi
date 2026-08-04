import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import AppModal from '../components/AppModal';
import { Photo, SceneMarker, PersonProfile } from '../types';
import WebMapView from '../components/WebMapView';
import PhotoDetail from './PhotoDetail';
import { triggerLightHaptic } from '../utils/haptics';
import CharacterPreview from '../components/CharacterPreview';
import CharacterSheet from '../components/CharacterSheet';
import SettingsModal from '../components/SettingsModal';
import { findMarkerIndexByPhotoId } from '../utils/mapNavigation';
import { minimalistColors, minimalistRadii, minimalistShadows, minimalistTypography } from '../theme/minimalistTheme';

interface MapScreenProps {
  photos: Photo[];
  markers: SceneMarker[];
  onOpenUploader: () => void;
  latestPhoto?: Photo | null;
  onSceneChange?: (photoId: string, tag: string) => void;
  onBannerDismiss?: () => void;
  onDeletePhoto: (photoId: string) => void;
  onUpdatePhoto: (photoId: string, updates: Partial<Photo>) => void;
  onRetrySticker?: (photoId: string) => void;
  focusPhotoId?: string;
  filterDateStr?: string;
  onClearFilter?: () => void;
}

export default function MapScreen({
  photos,
  markers: allMarkers,
  onOpenUploader,
  latestPhoto,
  onSceneChange,
  onBannerDismiss,
  onDeletePhoto,
  onUpdatePhoto,
  onRetrySticker,
  focusPhotoId,
  filterDateStr,
  onClearFilter,
}: MapScreenProps) {
  const [selectedMarkerIndex, setSelectedMarkerIndex] = useState<number>(-1);
  const [detailMarker, setDetailMarker] = useState<SceneMarker | null>(null);
  const [showWheel, setShowWheel] = useState(false);
  const [previewCharacterUri, setPreviewCharacterUri] = useState<string | null>(null);
  const [previewPlaceName, setPreviewPlaceName] = useState<string | undefined>();
  const [selectedCharacterProfile, setSelectedCharacterProfile] = useState<PersonProfile | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const mapRef = React.useRef<any>(null);

  // Filter markers by date if filterDateStr is provided
  const markers = React.useMemo(() => {
    if (!filterDateStr) return allMarkers;
    return allMarkers.filter(m => m.photos.some(p => {
      const date = new Date(p.date || Date.now());
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return dateStr === filterDateStr;
    }));
  }, [allMarkers, filterDateStr]);

  // Keep detailMarker and selectedMarker in sync with markers prop to reflect global updates
  useEffect(() => {
    if (detailMarker) {
      const updatedMarker = markers.find(m => m.id === detailMarker.id);
      if (updatedMarker && updatedMarker !== detailMarker) {
        setDetailMarker(updatedMarker);
      }
    }
  }, [markers, detailMarker]);

  const selectedMarker = selectedMarkerIndex >= 0 ? markers[selectedMarkerIndex] : null;

  // Auto-focus logic for filterDateStr
  useEffect(() => {
    if (filterDateStr && markers.length > 0 && mapRef.current) {
      // Calculate bounds for all filtered markers
      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
      markers.forEach(m => {
        if (m.location.latitude < minLat) minLat = m.location.latitude;
        if (m.location.latitude > maxLat) maxLat = m.location.latitude;
        if (m.location.longitude < minLng) minLng = m.location.longitude;
        if (m.location.longitude > maxLng) maxLng = m.location.longitude;
      });
      // Add padding
      const padding = 0.05; // ~5km padding
      mapRef.current.fitBounds([
        [minLat - padding, minLng - padding],
        [maxLat + padding, maxLng + padding]
      ]);
    }
  }, [filterDateStr, markers]);

  const handleMarkerPress = useCallback(
    (index: number) => {
      setSelectedMarkerIndex(index);
      setShowWheel(true);
      const marker = markers[index];
      const characterUri = marker?.photos.find((photo) => photo.characterUri)?.characterUri;
      if (characterUri) {
        setPreviewCharacterUri(characterUri);
        setPreviewPlaceName(marker.location.placeName);
      }
    },
    [markers]
  );

  const handleWheelSelect = useCallback(
    (index: number) => {
      setSelectedMarkerIndex(index);
    },
    []
  );

  useEffect(() => {
    if (latestPhoto && markers.length > 0) {
      const idx = markers.findIndex((m) =>
        m.photos.some((p) => p.id === latestPhoto.id)
      );
      if (idx >= 0) {
        setSelectedMarkerIndex(idx);
      } else {
        setSelectedMarkerIndex(markers.length - 1);
      }
    } else if (markers.length > 0 && selectedMarkerIndex === -1) {
      setSelectedMarkerIndex(markers.length - 1);
    }
  }, [latestPhoto, markers]);

  useEffect(() => {
    const targetIndex = findMarkerIndexByPhotoId(markers, focusPhotoId);
    if (targetIndex >= 0) {
      setSelectedMarkerIndex(targetIndex);
      setShowWheel(false);
    }
  }, [focusPhotoId, markers]);

  const handleBannerConfirm = useCallback(() => {
    onBannerDismiss?.();
  }, [onBannerDismiss]);

  const handleBannerChangeScene = useCallback(
    (tag: string) => {
      if (latestPhoto && onSceneChange) {
        onSceneChange(latestPhoto.id, tag);
      }
    },
    [latestPhoto, onSceneChange]
  );

  // Empty state
  if (markers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.emptyContent}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>+</Text>
            </View>
            <Text style={styles.emptyTitle}>MemoryMap</Text>
            <Text style={styles.emptySubtitle}>
              在地图上记录你的每一段旅程回忆
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => { triggerLightHaptic(); onOpenUploader(); }} activeOpacity={0.8}>
              <Text style={styles.emptyBtnText}>上传第一张照片</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <WebMapView
          markers={markers}
          selectedIndex={selectedMarkerIndex}
          onMarkerPress={handleMarkerPress}
        />
      </View>

      {/* Settings Button */}
      <SafeAreaView style={styles.topRightArea} pointerEvents="box-none">
        <TouchableOpacity style={[styles.settingsBtn, minimalistShadows.floating]} onPress={() => { triggerLightHaptic(); setShowSettings(true); }}>
          <Text style={styles.settingsBtnText}>⚙️</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Date Filter Indicator */}
      {filterDateStr && (
        <View style={styles.filterBanner}>
          <Text style={styles.filterBannerText}>正在浏览 {filterDateStr} 的回忆</Text>
          <TouchableOpacity onPress={() => { triggerLightHaptic(); onClearFilter?.(); }} style={styles.clearFilterButton}>
            <Text style={styles.clearFilterButtonText}>退出</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Control Area */}
      <SafeAreaView style={styles.bottomArea} pointerEvents="box-none">
        {/* Info bar - Acts like a bottom sheet docked to bottom */}
        {selectedMarker && !detailMarker ? (
          <View style={styles.infoSheet}>
            <View style={styles.infoSheetContent}>
              <View style={styles.infoSheetText}>
                <Text style={styles.infoSheetTitle} numberOfLines={1}>
                  {selectedMarker.location.placeName || '未知地点'}
                </Text>
                <Text style={styles.infoSheetDesc}>
                  {selectedMarker.description} · {selectedMarker.photos.length} 张照片
                </Text>
              </View>
              <TouchableOpacity
                style={styles.infoSheetBtn}
                onPress={() => { triggerLightHaptic(); setDetailMarker(selectedMarker); }}
                activeOpacity={0.8}
              >
                <Text style={styles.infoSheetBtnText}>详情</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.infoSheetClose} onPress={() => {
              triggerLightHaptic();
              setSelectedMarkerIndex(-1);
              setShowWheel(false);
            }}>
              <Text style={styles.infoSheetCloseText}>收起</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Minimalist FAB - only shown when info sheet is hidden */
          <TouchableOpacity
            style={[styles.fab, minimalistShadows.floating]}
            onPress={() => { triggerLightHaptic(); onOpenUploader(); }}
            activeOpacity={0.8}
          >
            <Text style={styles.fabIcon}>+</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* Detail modal */}
      <AppModal visible={detailMarker !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetailMarker(null)}>
        {detailMarker && (
          <PhotoDetail
            marker={detailMarker}
            onClose={() => setDetailMarker(null)}
            onDeletePhoto={onDeletePhoto}
            onUpdatePhoto={onUpdatePhoto}
            onRetrySticker={onRetrySticker}
            onCharacterPress={(profile) => setSelectedCharacterProfile(profile)}
          />
        )}
      </AppModal>

      <CharacterSheet
        visible={!!selectedCharacterProfile}
        profile={selectedCharacterProfile}
        allMarkers={markers}
        onClose={() => setSelectedCharacterProfile(null)}
        onStickerPress={(idx) => {
          setSelectedCharacterProfile(null);
          setTimeout(() => {
            setDetailMarker(markers[idx]);
          }, 300);
        }}
        onUpdatePhoto={onUpdatePhoto}
      />
      
      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />

      {previewCharacterUri && (
        <CharacterPreview
          imageUri={previewCharacterUri}
          placeName={previewPlaceName}
          onClose={() => setPreviewCharacterUri(null)}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: minimalistColors.background },
  mapContainer: { ...StyleSheet.absoluteFillObject },

  // Bottom Control Area
  bottomArea: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    justifyContent: 'flex-end',
    paddingBottom: 88, // Safely above bottom tab bar (~75px height)
    zIndex: 100,
  },

  // Minimalist FAB
  fab: {
    alignSelf: 'flex-end',
    marginRight: 24,
    marginBottom: 16,
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: minimalistColors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  fabIcon: {
    fontSize: 28, color: minimalistColors.textOnAccent,
    fontWeight: '300', marginTop: -2,
  },

  // Info Sheet (Bottom Sheet Style)
  infoSheet: {
    backgroundColor: minimalistColors.surface,
    borderTopLeftRadius: minimalistRadii.xl,
    borderTopRightRadius: minimalistRadii.xl,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: minimalistColors.border,
    ...minimalistShadows.floating,
  },
  infoSheetContent: { flexDirection: 'row', alignItems: 'center' },
  infoSheetEmoji: { fontSize: 32, marginRight: 16 },
  infoSheetText: { flex: 1 },
  infoSheetTitle: { ...minimalistTypography.headline, color: minimalistColors.textPrimary, marginBottom: 4 },
  infoSheetDesc: { ...minimalistTypography.caption, color: minimalistColors.textSecondary },
  infoSheetBtn: {
    backgroundColor: minimalistColors.accent,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: minimalistRadii.round,
  },
  infoSheetBtnText: { ...minimalistTypography.subhead, color: minimalistColors.textOnAccent, fontWeight: '600' },
  infoSheetClose: {
    marginTop: 20, paddingVertical: 12,
    alignItems: 'center', borderTopWidth: 1, borderColor: minimalistColors.border,
  },
  infoSheetCloseText: { ...minimalistTypography.subhead, color: minimalistColors.textMuted },

  // Empty state
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
  filterBanner: {
    position: 'absolute',
    top: 60,
    left: '10%',
    right: '10%',
    backgroundColor: 'rgba(30,30,30,0.85)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  filterBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearFilterButton: {
    backgroundColor: minimalistColors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  clearFilterButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  topRightArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingTop: 16,
    paddingRight: 16,
    zIndex: 100,
  },
  settingsBtn: {
    backgroundColor: minimalistColors.background,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnText: {
    fontSize: 20,
  }
});
