import React, { useState, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Photo } from './src/types';
import { usePhotoStore } from './src/hooks/usePhotoStore';
import MapScreen from './src/screens/MapScreen';
import TimelineScreen from './src/screens/TimelineScreen';
import PhotoUploader from './src/components/PhotoUploader';
import IPhoneAirFrame from './src/components/iPhoneAirFrame';
import PwaInstallHint from './src/components/PwaInstallHint';
import { triggerLightHaptic } from './src/utils/haptics';
import { reverseGeocode } from './src/services/amapService';
import { generateCharacterSticker } from './src/services/characterGeneration';
import { personStore } from './src/services/personStore';
import { runCloudMigration } from './src/services/cloudMigration';
import MigrationOverlay from './src/components/MigrationOverlay';
import DynamicIsland from './src/components/DynamicIsland';
import { colors, typography, liquidGlass } from './src/theme/appleTheme';
import { industrialColors, industrialShadows, industrialTypography } from './src/theme/industrialTheme';

type Screen = 'map' | 'timeline';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('map');
  const [timelineResetKey, setTimelineResetKey] = useState(0);
  const [showUploader, setShowUploader] = useState(false);
  const [latestPhoto, setLatestPhoto] = useState<Photo | null>(null);
  const [mapFocusPhotoId, setMapFocusPhotoId] = useState<string | undefined>();
  const [mapFilterDateStr, setMapFilterDateStr] = useState<string | undefined>();
  const [queueState, setQueueState] = useState<{ type: 'idle' | 'generating' | 'success' | 'error', message?: string }>({ type: 'idle' });
  const [migrationState, setMigrationState] = useState<{ total: number, current: number, error?: string }>({ total: 0, current: 0 });
  const store = usePhotoStore();
  const isGeneratingRef = React.useRef(false);

  const startMigration = useCallback(() => {
    setMigrationState({ total: 0, current: 0, error: undefined });
    runCloudMigration(
      (current, total) => setMigrationState(prev => ({ ...prev, current, total })),
      (error) => setMigrationState(prev => ({ ...prev, error }))
    );
  }, []);

  React.useEffect(() => {
    startMigration();
  }, [startMigration]);

  // Background Sticker Generation Queue
  React.useEffect(() => {
    const processQueue = async () => {
      if (isGeneratingRef.current) return;
      
      const generatingPhotos = store.photos.filter(p => p.isGeneratingSticker && p.generationUri);
      if (generatingPhotos.length === 0) {
        if (queueState.type === 'generating') {
           // Should not happen naturally, but safety fallback
           setQueueState({ type: 'idle' });
        }
        return;
      }
      
      const nextPhoto = generatingPhotos[0];

      isGeneratingRef.current = true;
      setQueueState({ type: 'generating', message: `正在绘制贴纸 (${generatingPhotos.length}张剩余)...` });
      
      try {
        const generated = await generateCharacterSticker(
          nextPhoto.generationUri!,
          nextPhoto.peopleCount ?? 1,
          nextPhoto.personProfiles,
          nextPhoto.subjectType
        );
        
        // Update base character URIs for newly created profiles
        if (nextPhoto.personProfiles) {
          for (const profile of nextPhoto.personProfiles) {
            if (profile && !profile.baseCharacterUri) {
              await personStore.updateProfileBaseCharacter(profile.id, generated.imageDataUrl);
            }
          }
        }

        store.updatePhoto(nextPhoto.id, {
          isGeneratingSticker: false,
          generationUri: undefined,
          characterUri: generated.imageDataUrl,
          characterModel: generated.model,
          characterGenerationError: undefined,
        });
        
        setQueueState({ type: 'success', message: '✨ 贴纸生成成功' });
        setTimeout(() => setQueueState({ type: 'idle' }), 3000);
      } catch (error: any) {
        store.updatePhoto(nextPhoto.id, {
          isGeneratingSticker: false,
          generationUri: undefined,
          characterGenerationError: error?.message || '生成失败',
        });
        setQueueState({ type: 'error', message: `❌ 生成失败: ${error?.message || '未知错误'}` });
        setTimeout(() => setQueueState({ type: 'idle' }), 4000);
      } finally {
        isGeneratingRef.current = false;
      }
    };

    processQueue();
  }, [store.photos, store.updatePhoto]);

  const handlePhotosAdded = useCallback(
    (photos: Photo[]) => {
      store.addPhotos(photos);
      if (photos.length > 0) {
        setLatestPhoto(photos[0]);
      }

      photos.forEach(async (photo) => {
        if (
          photo.location.placeName
          || !Number.isFinite(photo.location.latitude)
          || !Number.isFinite(photo.location.longitude)
        ) return;
        try {
          const result = await reverseGeocode(photo.location.latitude, photo.location.longitude);
          if (result) {
            store.updatePhoto(photo.id, {
              location: {
                ...photo.location,
                address: result.address,
                placeName: result.placeName,
              },
            });
          }
        } catch {}
      });
    },
    [store]
  );

  const handleSceneChange = useCallback(
    (photoId: string, tag: string) => {
      store.updatePhoto(photoId, { tag });
      setLatestPhoto(null);
    },
    [store]
  );

  const handleBannerDismiss = useCallback(() => {
    setLatestPhoto(null);
  }, []);

  const handleNavigateToMap = useCallback((photoId?: string) => {
    setCurrentScreen('map');
    setMapFocusPhotoId(photoId);
    setMapFilterDateStr(undefined);
  }, []);

  const handleNavigateToMapDate = useCallback((dateStr: string) => {
    setCurrentScreen('map');
    setMapFilterDateStr(dateStr);
    setMapFocusPhotoId(undefined);
  }, []);

  // Retry sticker generation for a photo that previously failed
  const handleRetrySticker = useCallback((photoId: string) => {
    const photo = store.photos.find(p => p.id === photoId);
    if (!photo) return;
    store.updatePhoto(photoId, {
      isGeneratingSticker: true,
      generationUri: photo.uri,
      characterGenerationError: undefined,
    });
  }, [store]);

  // Keep hook order stable while persisted photos hydrate. Returning before the
  // callbacks above causes React error #310 when hydration flips to complete.
  if (!store.isHydrated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={industrialColors.accent} />
        <Text style={styles.loadingText}>正在读取你的回忆…</Text>
      </View>
    );
  }

  return (
    <IPhoneAirFrame>
      <View style={styles.container}>
        {store.storageError && (
          <View style={styles.storageWarning}>
            <Text style={styles.storageWarningText}>{store.storageError}</Text>
          </View>
        )}

        {/* Cloud Migration Overlay */}
        {migrationState.total > 0 && (migrationState.current < migrationState.total || migrationState.error) && (
        <MigrationOverlay
          progress={migrationState.current}
          total={migrationState.total}
          error={migrationState.error}
          onRetry={startMigration}
        />
      )}
        <PwaInstallHint />
        
        <DynamicIsland state={queueState} markerCount={store.markers.length} />

        {currentScreen === 'map' && (
          <MapScreen
            photos={store.photos}
            markers={store.markers}
            onOpenUploader={() => setShowUploader(true)}
            latestPhoto={latestPhoto}
            onSceneChange={handleSceneChange}
            onBannerDismiss={handleBannerDismiss}
            onDeletePhoto={store.removePhoto}
            onUpdatePhoto={store.updatePhoto}
            onRetrySticker={handleRetrySticker}
            focusPhotoId={mapFocusPhotoId}
            filterDateStr={mapFilterDateStr}
            onClearFilter={() => setMapFilterDateStr(undefined)}
          />
        )}
        {currentScreen === 'timeline' && (
          <TimelineScreen
            photos={store.photos}
            dayStories={store.dayStories}
            onNavigateToMap={handleNavigateToMap}
            onNavigateToMapDate={handleNavigateToMapDate}
            onOpenUploader={() => setShowUploader(true)}
            resetKey={timelineResetKey}
          />
        )}

        {/* Bottom Tab Bar — Apple style */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => { triggerLightHaptic(); handleNavigateToMap(); }}
            activeOpacity={0.6}
          >
            <Text style={[styles.tabLabel, currentScreen === 'map' && styles.tabLabelActive]}>
              地图
            </Text>
            {currentScreen === 'map' && <View style={styles.tabDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => { triggerLightHaptic(); setCurrentScreen('timeline'); setTimelineResetKey(k => k + 1); }}
            activeOpacity={0.6}
          >
            <Text style={[styles.tabLabel, currentScreen === 'timeline' && styles.tabLabelActive]}>
              回忆
            </Text>
            {currentScreen === 'timeline' && <View style={styles.tabDot} />}
          </TouchableOpacity>
        </View>

        <PhotoUploader
          visible={showUploader}
          onClose={() => setShowUploader(false)}
          onPhotosAdded={handlePhotosAdded}
        />
      </View>
    </IPhoneAirFrame>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: industrialColors.chassis },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: industrialColors.chassis,
  },
  loadingText: {
    fontFamily: industrialTypography.labelMono.fontFamily,
    fontSize: 12,
    color: industrialColors.textMuted,
  },
  storageWarning: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    zIndex: 1000,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFF2CC',
  },
  storageWarningText: {
    fontSize: 12,
    color: '#6B4E00',
    textAlign: 'center',
  },
  tabBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    backgroundColor: industrialColors.chassis,
    borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.6)',
    paddingBottom: 28, paddingTop: 12,
    ...industrialShadows.floating,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 4,
  },
  tabLabel: {
    fontFamily: industrialTypography.labelMono.fontFamily,
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    color: industrialColors.textMuted,
  },
  tabLabelActive: {
    color: industrialColors.accent,
  },
  tabDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: industrialColors.accent,
    marginTop: 4,
  },
  islandCapsule: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    zIndex: 9999,
    ...industrialShadows.floating,
  },
  islandText: {
    fontFamily: industrialTypography.body.fontFamily,
    fontSize: 13,
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
});
