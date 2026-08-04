import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { minimalistColors, minimalistRadii, minimalistShadows, minimalistTypography } from '../theme/minimalistTheme';
import { stickerShadow } from '../theme/appleTheme';

interface CharacterPreviewProps {
  imageUri: string;
  placeName?: string;
  onClose: () => void;
}

export default function CharacterPreview({ imageUri, placeName, onClose }: CharacterPreviewProps) {
  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        accessibilityLabel="关闭动漫贴纸大图"
        activeOpacity={1}
        onPress={onClose}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.card}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.75}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
        <Image source={{ uri: imageUri }} style={[styles.image, stickerShadow as any]} resizeMode="contain" />
        <Text style={styles.caption}>{placeName || '回忆动漫贴纸'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(12, 16, 22, 0.72)',
    // @ts-ignore web-only visual polish
    backdropFilter: 'blur(8px)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 0.88,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: minimalistRadii.xl,
    backgroundColor: minimalistColors.surface,
    borderWidth: 1,
    borderColor: minimalistColors.border,
    ...minimalistShadows.floating,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28, 32, 38, 0.08)',
  },
  closeText: { fontSize: 28, lineHeight: 30, color: minimalistColors.textPrimary, fontWeight: '300' },
  image: { width: '100%', aspectRatio: 1 },
  caption: { ...minimalistTypography.subhead, color: minimalistColors.textSecondary, marginTop: 8 },
});
