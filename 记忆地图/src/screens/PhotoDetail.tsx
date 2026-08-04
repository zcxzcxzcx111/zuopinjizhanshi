import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  TextInput,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SceneMarker, Photo, PersonProfile } from '../types';
import QCharacter from '../components/QCharacter';
import { colors, typography, spacing, radius, stickerShadow } from '../theme/appleTheme';
import { personStore } from '../services/personStore';
import { triggerLightHaptic } from '../utils/haptics';
import { detectFaces } from '../services/faceDetection';
import PhotoAssetImage from '../components/PhotoAssetImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PhotoDetailProps {
  marker: SceneMarker;
  onClose: () => void;
  onDeletePhoto: (photoId: string) => void;
  onUpdatePhoto: (photoId: string, updates: Partial<Photo>) => void;
  onRetrySticker?: (photoId: string) => void;
  onCharacterPress?: (profile: import('../types').PersonProfile) => void;
}

export default function PhotoDetail({ marker, onClose, onDeletePhoto, onUpdatePhoto, onRetrySticker, onCharacterPress }: PhotoDetailProps) {
  const [namingFace, setNamingFace] = useState<{ photoId: string; faceIndex: number; face: any } | null>(null);
  const [namingText, setNamingText] = useState('');
  const processingRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    let mounted = true;
    const missing = marker.photos.filter(p => p.rawFaces === undefined && !processingRef.current.has(p.id));
    
    if (missing.length > 0) {
      missing.forEach(p => processingRef.current.add(p.id));
      
      const processSequential = async () => {
        for (const photo of missing) {
          if (!mounted) break;
          try {
            // photo.uri is transient – load from asset store if not in memory
            let uriToUse = photo.uri;
            if (!uriToUse) {
              const { loadPhotoAssets } = await import('../services/photoAssetStorage');
              const assets = await loadPhotoAssets(photo.id);
              uriToUse = assets?.uri;
            }
            if (!uriToUse) continue;
            const faces = await detectFaces(uriToUse);
            if (!mounted) break;
            const rawFaces = faces.map(f => ({
              ...f,
              descriptor: f.descriptor ? Array.from(f.descriptor) : undefined
            }));
            onUpdatePhoto(photo.id, { rawFaces });
          } catch (err) {
            console.warn('Failed to lazy detect faces for', photo.id, err);
          }
        }
      };
      processSequential();
    }
    return () => { mounted = false; };
  }, [marker.photos, onUpdatePhoto]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${year}年${month}月${day}日 ${weekdays[d.getDay()]}`;
  };

  const handleDeletePhoto = (photoId: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('确定要删除这张照片吗？此操作不可撤销。');
      if (confirmed) {
        onDeletePhoto(photoId);
        if (marker.photos.length <= 1) onClose();
      }
    } else {
      Alert.alert('删除照片', '确定要删除这张照片吗？此操作不可撤销。', [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            onDeletePhoto(photoId);
            if (marker.photos.length <= 1) onClose();
          },
        },
      ]);
    }
  };

  const uniqueProfiles = React.useMemo(() => {
    const map = new Map<string, PersonProfile>();
    marker.photos.forEach(photo => {
      photo.personProfiles?.forEach(p => {
        if (p && p.name && !map.has(p.name)) {
          map.set(p.name, p);
        }
      });
    });
    return Array.from(map.values());
  }, [marker.photos]);

  const unnamedFaces = React.useMemo(() => {
    const list: { photoId: string; faceIndex: number; face: any }[] = [];
    marker.photos.forEach(photo => {
      if (photo.rawFaces) {
        photo.rawFaces.forEach((face, index) => {
          const profile = photo.personProfiles?.[index];
          if (!profile || !profile.name) {
            list.push({ photoId: photo.id, faceIndex: index, face });
          }
        });
      }
    });
    return list;
  }, [marker.photos]);

  const handleNameUnnamedFace = (item: { photoId: string; faceIndex: number; face: any }) => {
    setNamingFace(item);
    setNamingText('');
  };

  const processName = async () => {
    if (!namingFace || !namingText.trim()) {
      setNamingFace(null);
      return;
    }
    
    const photo = marker.photos.find(p => p.id === namingFace.photoId);
    if (!photo) {
      setNamingFace(null);
      return;
    }

    let desc: any = undefined;
    if (namingFace.face?.descriptor) {
      desc = namingFace.face.descriptor;
      if (!Array.isArray(desc) && typeof desc === 'object') {
        // Handle data that was saved as an object due to Float32Array stringification
        desc = Object.keys(desc)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map(key => desc[key]);
      }
    }

    const profile = await personStore.addProfile(namingText.trim(), desc || []);
    
    const newProfiles = photo.personProfiles ? [...photo.personProfiles] : new Array(photo.rawFaces?.length || 0).fill(null);
    const newRawFaces = photo.rawFaces ? [...photo.rawFaces] : [];

    if (namingFace.faceIndex === -1) {
      // Manually added profile without AI face
      newProfiles.push(profile);
      newRawFaces.push({ manual: true });
    } else {
      newProfiles[namingFace.faceIndex] = profile;
    }

    onUpdatePhoto(photo.id, { personProfiles: newProfiles, rawFaces: newRawFaces });
    setNamingFace(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { triggerLightHaptic(); onClose(); }} style={styles.closeBtn} activeOpacity={0.6}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerDate}>{formatDate(marker.date)}</Text>
          <Text style={styles.headerPlace}>{marker.location.placeName || '未知地点'}</Text>
          {marker.location.address && (
            <Text style={styles.headerAddress}>{marker.location.address}</Text>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Character */}
        <View style={styles.characterSection}>
          <QCharacter
            
            date={marker.date}
            description={marker.description}
            size={120}
            showLabel={false}
            imageUri={marker.photos.find((photo) => photo.characterUri)?.characterUri}
          />
          <Text style={styles.characterCaption}>{marker.description}</Text>
        </View>

        {/* Sticker Status */}
        <View style={styles.switchSection}>
          {(() => {
            const failedPhoto = marker.photos.find(p => p.characterGenerationError);
            const generatingPhoto = marker.photos.find(p => p.isGeneratingSticker);
            const successPhoto = marker.photos.find(p => p.characterUri);
            if (generatingPhoto) {
              return <Text style={styles.switchBtnText}>✨ 贴纸生成中...</Text>;
            }
            if (failedPhoto && !successPhoto) {
              return (
                <TouchableOpacity
                  style={styles.retryBtn}
                  activeOpacity={0.8}
                  onPress={() => { triggerLightHaptic(); onRetrySticker?.(failedPhoto.id); }}
                >
                  <Text style={styles.retryBtnText}>⚠️ 贴纸生成失败，点击重试</Text>
                </TouchableOpacity>
              );
            }
            return <Text style={styles.switchBtnText}>贴纸已生成</Text>;
          })()}
        </View>

        {/* Characters Section */}
        {(uniqueProfiles.length > 0 || unnamedFaces.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>出场人物</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profilesScroll}>
              {uniqueProfiles.map(profile => (
                <TouchableOpacity 
                  key={profile.name} 
                  style={styles.profileItem}
                  activeOpacity={0.7}
                  onPress={() => { triggerLightHaptic(); onCharacterPress?.(profile); }}
                >
                  <View style={[styles.profileAvatar, profile.baseCharacterUri ? { overflow: 'visible', backgroundColor: 'transparent', borderWidth: 0 } : {}]}>
                    {profile.baseCharacterUri ? (
                      <Image source={{ uri: profile.baseCharacterUri }} style={[styles.profileAvatarImg, stickerShadow as any]} resizeMode="contain" />
                    ) : (
                      <Text style={styles.profileAvatarText}>{profile.name.substring(0, 1)}</Text>
                    )}
                  </View>
                  <Text style={styles.profileNameText} numberOfLines={1}>{profile.name}</Text>
                </TouchableOpacity>
              ))}

              {unnamedFaces.map((item, index) => (
                <TouchableOpacity 
                  key={`unnamed-${item.photoId}-${item.faceIndex}-${index}`} 
                  style={styles.profileItem}
                  activeOpacity={0.7}
                  onPress={() => { triggerLightHaptic(); handleNameUnnamedFace(item); }}
                >
                  <View style={[styles.profileAvatar, { backgroundColor: colors.separator }]}>
                    <Text style={[styles.profileAvatarText, { color: colors.textSecondary }]}>?</Text>
                  </View>
                  <Text style={[styles.profileNameText, { color: colors.textSecondary }]} numberOfLines={1}>待命名</Text>
                </TouchableOpacity>
              ))}
              
              {marker.photos.length > 0 && (
                <TouchableOpacity 
                  style={styles.profileItem}
                  activeOpacity={0.7}
                  onPress={() => { triggerLightHaptic(); handleNameUnnamedFace({ photoId: marker.photos[0].id, faceIndex: -1, face: {} }); }}
                >
                  <View style={[styles.profileAvatar, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.accent, borderStyle: 'dashed' }]}>
                    <Text style={[styles.profileAvatarText, { color: colors.accent }]}>+</Text>
                  </View>
                  <Text style={[styles.profileNameText, { color: colors.accent }]} numberOfLines={1}>添加人物</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>照片 ({marker.photos.length})</Text>
          {marker.photos.map((photo, index) => (
            <View key={photo.id} style={styles.photoCard}>
              <PhotoAssetImage photo={photo} style={styles.photoImage} resizeMode="cover" />
              <View style={styles.photoInfo}>
                <Text style={styles.photoDesc}>{photo.description}</Text>
                <TouchableOpacity 
                  onPress={() => { triggerLightHaptic(); handleDeletePhoto(photo.id); }} 
                  activeOpacity={0.6}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>删除照片</Text>
                </TouchableOpacity>
              </View>
              {photo.isDailyPick && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>精选</Text>
                </View>
              )}
              {index < marker.photos.length - 1 && <View style={styles.photoDivider} />}
            </View>
          ))}
        </View>

        {/* Location Info — iOS grouped list style */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>位置信息</Text>
          <View style={styles.groupedCard}>
            <View style={styles.groupedRow}>
              <Text style={styles.groupedLabel}>纬度</Text>
              <Text style={styles.groupedValue}>{marker.location.latitude.toFixed(4)}</Text>
            </View>
            <View style={styles.groupedSeparator} />
            <View style={styles.groupedRow}>
              <Text style={styles.groupedLabel}>经度</Text>
              <Text style={styles.groupedValue}>{marker.location.longitude.toFixed(4)}</Text>
            </View>
            {marker.location.placeName && (
              <>
                <View style={styles.groupedSeparator} />
                <View style={styles.groupedRow}>
                  <Text style={styles.groupedLabel}>地点</Text>
                  <Text style={styles.groupedValue}>{marker.location.placeName}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Name Input Modal */}
      <Modal
        visible={namingFace !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setNamingFace(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>命名人物</Text>
            <Text style={styles.modalDesc}>请输入这个人的名字，系统会永久保存 TA 的样子：</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="例如：张三"
              value={namingText}
              onChangeText={setNamingText}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={processName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => { triggerLightHaptic(); setNamingFace(null); }}>
                <Text style={styles.modalBtnCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={() => { triggerLightHaptic(); processName(); }}>
                <Text style={styles.modalBtnSubmitText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl, paddingTop: 50, paddingBottom: spacing.lg,
    borderBottomWidth: 0.5, borderBottomColor: colors.separator,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { fontSize: 16, color: colors.textSecondary, fontWeight: '600' },
  headerInfo: { flex: 1, marginLeft: spacing.md },
  headerDate: { ...typography.subhead, color: colors.textPrimary, fontWeight: '600' },
  headerPlace: { ...typography.caption1, color: colors.textSecondary, marginTop: 2 },
  headerAddress: { ...typography.caption2, color: colors.textTertiary, marginTop: 1 },
  content: { flex: 1 },
  characterSection: {
    alignItems: 'center', paddingVertical: spacing.xxl,
    backgroundColor: colors.background, marginBottom: spacing.sm,
  },
  characterCaption: { ...typography.headline, color: colors.textPrimary, marginTop: spacing.xl },
  switchSection: {
    alignItems: 'center', paddingVertical: spacing.md,
    backgroundColor: colors.background, marginBottom: spacing.sm,
  },
  switchBtnText: { ...typography.subhead, color: colors.accent, fontWeight: '600' },
  retryBtn: {
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  retryBtnText: { ...typography.subhead, color: '#FF9500', fontWeight: '600' },
  section: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  sectionTitle: { ...typography.headline, color: colors.textPrimary, marginBottom: spacing.md },
  photoCard: { marginBottom: spacing.md },
  photoImage: {
    width: '100%', height: SCREEN_WIDTH * 0.55,
    borderRadius: radius.md, backgroundColor: colors.surface,
  },
  photoInfo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: spacing.sm + 2,
  },
  photoDesc: { ...typography.subhead, color: colors.textPrimary, flex: 1, marginRight: spacing.md },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  deleteButtonText: { 
    ...typography.subhead, 
    color: colors.destructive, 
    fontWeight: '600',
    fontSize: 13,
  },
  badge: {
    position: 'absolute', top: spacing.md, right: spacing.md,
    backgroundColor: colors.accent, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  badgeText: { ...typography.caption2, color: colors.textOnAccent, fontWeight: '600' },
  photoDivider: { height: 0.5, backgroundColor: colors.separator, marginTop: spacing.md },
  // iOS grouped list style
  groupedCard: {
    backgroundColor: colors.background, borderRadius: radius.md,
    borderWidth: 0.5, borderColor: colors.separator,
    overflow: 'hidden',
  },
  groupedRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  groupedLabel: { ...typography.subhead, color: colors.textSecondary },
  groupedValue: { ...typography.subhead, color: colors.textPrimary },
  groupedSeparator: { height: 0.5, backgroundColor: colors.separator, marginLeft: spacing.lg },
  profilesScroll: {
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  profileItem: {
    alignItems: 'center',
    width: 64,
    marginRight: spacing.md,
  },
  profileAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.xs,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.separator,
  },
  profileAvatarImg: {
    width: '100%', height: '100%',
  },
  profileAvatarText: {
    fontSize: 24, fontWeight: 'bold', color: colors.textOnAccent,
  },
  profileNameText: {
    ...typography.caption1, color: colors.textPrimary, textAlign: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.surface, width: '80%', borderRadius: radius.lg, padding: spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  modalTitle: { ...typography.headline, marginBottom: spacing.sm, textAlign: 'center' },
  modalDesc: { ...typography.caption1, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' },
  modalInput: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, 
    ...typography.body, marginBottom: spacing.xl },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtnCancel: { flex: 1, padding: spacing.md, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.background, marginRight: spacing.sm },
  modalBtnCancelText: { ...typography.subhead, color: colors.textSecondary },
  modalBtnSubmit: { flex: 1, padding: spacing.md, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.accent, marginLeft: spacing.sm },
  modalBtnSubmitText: { ...typography.subhead, color: colors.surface },
});
