import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SceneMarker, PersonProfile, Photo } from '../types';
import { personStore } from '../services/personStore';
import AppModal from './AppModal';
import { colors, typography, spacing, radius, stickerShadow } from '../theme/appleTheme';
import { usePhotoAsset } from '../hooks/usePhotoAsset';

/** Small helper that lazy-loads an asset and renders an Image. */
function PhotoAssetImage({ photo, style, resizeMode }: { photo: Photo; style?: any; resizeMode?: string }) {
  const { uri, characterUri } = usePhotoAsset(photo.id);
  const src = characterUri || photo.characterUri || uri || photo.uri;
  if (!src) return <View style={style} />;
  return <Image source={{ uri: src }} style={style} resizeMode={(resizeMode as any) || 'contain'} />;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CharacterSheetProps {
  visible: boolean;
  profile: PersonProfile | null;
  allMarkers: SceneMarker[];
  onClose: () => void;
  onStickerPress: (markerIndex: number) => void;
  onUpdatePhoto?: (photoId: string, updates: Partial<Photo>) => void;
}

export default function CharacterSheet({
  visible,
  profile,
  allMarkers,
  onClose,
  onStickerPress,
  onUpdatePhoto,
}: CharacterSheetProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [isChangingCover, setIsChangingCover] = useState(false);
  
  // Filter markers and photos that contain this character
  const { matchedPhotos, matchedMarkerIndices } = useMemo(() => {
    if (!profile) return { matchedPhotos: [], matchedMarkerIndices: [] };
    
    const photos: { photo: Photo; markerIndex: number; photoIndex: number }[] = [];
    const indices: number[] = [];
    
    allMarkers.forEach((marker, mIndex) => {
      marker.photos.forEach((photo, pIndex) => {
        if (photo.personProfiles && photo.personProfiles.some(p => p && (p.id === profile.id || p.name === profile.name))) {
          photos.push({ photo, markerIndex: mIndex, photoIndex: pIndex });
          if (!indices.includes(mIndex)) {
            indices.push(mIndex);
          }
        }
      });
    });
    
    return { matchedPhotos: photos, matchedMarkerIndices: indices };
  }, [profile, allMarkers]);

  const displayCoverUri = useMemo(() => {
    if (!profile) return null;
    if (profile.baseCharacterUri) return profile.baseCharacterUri;
    // Auto-fallback to the first available sticker
    return matchedPhotos.find(p => p.photo.characterUri)?.photo.characterUri || null;
  }, [profile, matchedPhotos]);

  const handleSelectCover = (uri: string) => {
    if (profile) {
      personStore.updateProfileBaseCharacter(profile.id, uri);
      if (onUpdatePhoto) {
        // Just trigger a re-render or let parent know, though personStore is separate.
        // The parent might need to fetch profiles again. Wait, CharacterSheet receives `profile` from parent.
        // We'll mutate the local profile object to reflect immediately.
        profile.baseCharacterUri = uri;
      }
    }
    setIsChangingCover(false);
  };

  const handleRenameSubmit = async () => {
    if (!profile || !renameText.trim() || renameText.trim() === profile.name) {
      setIsRenaming(false);
      return;
    }

    const newName = renameText.trim();
    
    // Repair potential duplicate profiles from old bugs by updating all that share the name or ID
    const profiles = await personStore.getProfiles();
    const relatedProfileIds = profiles.filter(p => p.id === profile.id || p.name === profile.name).map(p => p.id);
    for (const pid of relatedProfileIds) {
      await personStore.updateProfileName(pid, newName);
    }

    if (onUpdatePhoto) {
      matchedPhotos.forEach(({ photo }) => {
        if (photo.personProfiles) {
          const newProfiles = [...photo.personProfiles];
          // Find any profile that matches ID or OLD name
          const profileIndex = newProfiles.findIndex(p => p && (p.id === profile.id || p.name === profile.name));
          if (profileIndex >= 0) {
            newProfiles[profileIndex] = { ...newProfiles[profileIndex]!, name: newName };
            onUpdatePhoto(photo.id, { personProfiles: newProfiles });
          }
        }
      });
    }
    
    // We update local display optimistically but parent component will re-render anyway
    profile.name = newName;
    setIsRenaming(false);
  };

  if (!profile) return null;

  return (
    <AppModal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {isChangingCover && (
            <TouchableOpacity onPress={() => setIsChangingCover(false)} style={styles.closeBtn} activeOpacity={0.6}>
              <Text style={styles.closeBtnText}>←</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, isChangingCover ? { marginLeft: 'auto' } : {}]} activeOpacity={0.6}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {isChangingCover ? (
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { textAlign: 'center', marginBottom: spacing.md }]}>选择新封面</Text>
            <ScrollView style={styles.gallery} contentContainerStyle={styles.galleryContent} showsVerticalScrollIndicator={false}>
              {matchedPhotos.map(({ photo }, index) => {
                const isSelected = photo.hasCharacterUri
                  ? displayCoverUri === photo.characterUri
                  : displayCoverUri === photo.uri;
                return (
                  <TouchableOpacity
                    key={'cover-' + photo.id + '-' + index}
                    style={[styles.stickerCard, isSelected && { borderWidth: 2, borderColor: colors.accent }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      // Load from asset and set cover
                      import('../services/photoAssetStorage').then(({ loadPhotoAssets }) =>
                        loadPhotoAssets(photo.id).then(a => {
                          const coverUri = a?.characterUri || a?.uri || photo.characterUri || photo.uri;
                          if (coverUri) handleSelectCover(coverUri);
                        })
                      );
                    }}
                  >
                    <PhotoAssetImage photo={photo} style={[styles.stickerImage, stickerShadow as any]} resizeMode="contain" />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <>
            {/* Profile Info */}
            <View style={styles.profileSection}>
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setIsChangingCover(true)}
                style={[styles.avatarContainer, displayCoverUri ? { overflow: 'visible', backgroundColor: 'transparent', borderWidth: 0, elevation: 0, shadowOpacity: 0 } : {}]}
              >
                {displayCoverUri ? (
                  <Image source={{ uri: displayCoverUri }} style={[styles.avatarImage, stickerShadow as any]} resizeMode="contain" />
                ) : (
                  <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitials}>{profile.name.substring(0, 1)}</Text>
                  </View>
                )}
                <View style={styles.editBadge}>
                  <Text style={{ fontSize: 10 }}>✎</Text>
                </View>
              </TouchableOpacity>
          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <TouchableOpacity 
              style={styles.editBtn} 
              onPress={() => {
                setRenameText(profile.name);
                setIsRenaming(true);
              }}
            >
              <Text style={styles.editBtnText}>✎</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.profileStats}>
            出场 {matchedPhotos.length} 次 · 去了 {matchedMarkerIndices.length} 个地点
          </Text>
        </View>

        {/* Gallery */}
        <ScrollView style={styles.gallery} contentContainerStyle={styles.galleryContent} showsVerticalScrollIndicator={false}>
          {matchedPhotos.map(({ photo, markerIndex }, index) => (
            <TouchableOpacity 
              key={photo.id + '-' + index} 
              style={styles.stickerCard}
              activeOpacity={0.8}
              onPress={() => onStickerPress(markerIndex)}
            >
              <PhotoAssetImage
                photo={photo}
                style={[styles.stickerImage, stickerShadow as any]}
                resizeMode="contain"
              />
              {photo.description ? (
                <Text style={styles.stickerDesc} numberOfLines={2}>{photo.description}</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
        </>
        )}
      </View>

      {/* Rename Modal */}
      <Modal
        visible={isRenaming}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRenaming(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>修改姓名</Text>
            <Text style={styles.modalDesc}>请输入新的名字：</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="例如：张三"
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleRenameSubmit}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setIsRenaming(false)}>
                <Text style={styles.modalBtnCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleRenameSubmit}>
                <Text style={styles.modalBtnSubmitText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.surface 
  },
  header: {
    flexDirection: 'row', 
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl, 
    paddingTop: 20, 
    paddingBottom: spacing.sm,
  },
  closeBtn: {
    width: 32, 
    height: 32, 
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center', 
    alignItems: 'center',
  },
  closeBtnText: { 
    fontSize: 16, 
    color: colors.textSecondary, 
    fontWeight: '600' 
  },
  profileSection: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.separator,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: colors.background,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  editBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.surface,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.textOnAccent,
  },
  profileName: {
    ...typography.title2,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  profileStats: {
    ...typography.subhead,
    color: colors.textSecondary,
  },
  gallery: {
    flex: 1,
    backgroundColor: colors.background,
  },
  galleryContent: {
    padding: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  stickerCard: {
    width: (SCREEN_WIDTH - spacing.md * 3) / 2, // 2 columns
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stickerImage: {
    width: '100%',
    aspectRatio: 1,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  stickerDesc: {
    ...typography.caption2,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  editBtnText: {
    fontSize: 20,
    color: colors.textSecondary,
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
