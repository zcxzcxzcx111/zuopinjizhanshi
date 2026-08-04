import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import AppModal from './AppModal';
import { Photo } from '../types';
import { foodStickerCSS, animeSVGFilter } from '../services/foodArtService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FoodMarkerProps {
  photo: Photo;
  size?: number;
  showLabel?: boolean;
}

export default function FoodMarker({ photo, size = 70, showLabel = true }: FoodMarkerProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const handlePress = useCallback(() => {
    setShowOriginal(true);
  }, []);

  // Render the food pin on the map
  const renderFoodPin = () => {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <View style={[styles.pinContainer, { width: size, height: size * 1.3 }]}>
          {/* Anime-style food photo */}
          <View style={[styles.foodImageContainer, { width: size - 8, height: size - 8 }]}>
            <Image
              source={{ uri: photo.uri }}
              style={styles.foodImage}
              resizeMode="cover"
            />
            <View style={styles.animeOverlay} />
            <Text style={styles.sparkle1}>{'\u{2728}'}</Text>
            <Text style={styles.sparkle2}>{'\u{2728}'}</Text>
            <Text style={styles.sparkle3}>{'\u{2605}'}</Text>
          </View>
          <View style={styles.pinPointer}>
            <View style={styles.pinPointerInner} />
          </View>
          <Text style={styles.chopsticks}>{'\u{1F35C}'}</Text>
          <Text style={styles.tapHint}>{'\u{1F4F7}'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Food pin marker */}
      {renderFoodPin()}

      {/* Label bubble */}
      {showLabel && (
        <View style={styles.bubble}>
          <Text style={styles.bubbleEmoji}>{'\u{1F37D}'}</Text>
          <Text style={styles.bubbleDate}>{formatDate(photo.date)}</Text>
          <Text style={styles.bubbleDesc} numberOfLines={1}>
            {photo.description}
          </Text>
          <Text style={styles.bubbleHint}>点击看原图</Text>
        </View>
      )}

      {/* Original photo modal */}
      <AppModal
        visible={showOriginal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOriginal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOriginal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{'\u{1F37D}'} 菜品原图</Text>

            <Image
              source={{ uri: photo.uri }}
              style={styles.originalImage}
              resizeMode="contain"
            />

            <View style={styles.modalInfo}>
              <Text style={styles.modalDate}>{photo.date}</Text>
              <Text style={styles.modalDesc}>{photo.description}</Text>
              {photo.location.placeName && (
                <Text style={styles.modalPlace}>{'\u{1F4CD}'} {photo.location.placeName}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowOriginal(false)}
            >
              <Text style={styles.closeBtnText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </AppModal>
    </View>
  );
}

// Export food pin HTML for Leaflet divIcon markers
export function getFoodMarkerHTML(photoUri: string, size: number = 48): string {
  return `
    <div style="width:${size}px;height:${size * 1.3}px;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
      <div style="width:${size - 8}px;height:${size - 8}px;border-radius:50%;overflow:hidden;border:3px solid #FFB366;background:#FFF9E6;box-shadow:0 3px 6px rgba(0,0,0,0.2);position:relative;">
        <img src="${photoUri}" style="width:100%;height:100%;object-fit:cover;" />
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(255,179,102,0.15);mix-blend-mode:multiply;"></div>
        <span style="position:absolute;top:-2px;right:-2px;font-size:14px;">&#x2728;</span>
        <span style="position:absolute;top:2px;left:-4px;font-size:10px;">&#x2728;</span>
        <span style="position:absolute;bottom:8px;right:-4px;font-size:12px;color:#FFD700;">&#x2605;</span>
      </div>
      <div style="width:16px;height:16px;background:#FF6B6B;border-radius:2px;transform:rotate(45deg);margin-top:-8px;box-shadow:0 2px 3px rgba(0,0,0,0.15);"></div>
      <span style="font-size:16px;margin-top:-4px;">&#x1F35C;</span>
    </div>
  `;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  pinContainer: { alignItems: 'center', position: 'relative' },
  foodImageContainer: {
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFB366',
    backgroundColor: '#FFF9E6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    position: 'relative',
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  animeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 179, 102, 0.15)',
  },
  sparkle1: {
    position: 'absolute',
    top: -2,
    right: -2,
    fontSize: 14,
  },
  sparkle2: {
    position: 'absolute',
    top: 2,
    left: -4,
    fontSize: 10,
  },
  sparkle3: {
    position: 'absolute',
    bottom: 8,
    right: -4,
    fontSize: 12,
    color: '#FFD700',
  },
  pinPointer: {
    width: 16,
    height: 16,
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
    marginTop: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  pinPointerInner: {
    width: 6,
    height: 6,
    backgroundColor: '#E55B5B',
    borderRadius: 1,
    position: 'absolute',
    top: 5,
    left: 5,
  },
  chopsticks: {
    position: 'absolute',
    bottom: -8,
    fontSize: 16,
  },
  tapHint: {
    position: 'absolute',
    top: -6,
    right: -6,
    fontSize: 12,
    backgroundColor: 'white',
    borderRadius: 10,
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bubble: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 130,
  },
  bubbleEmoji: { fontSize: 14 },
  bubbleDate: { fontSize: 11, color: '#666', marginTop: 2 },
  bubbleDesc: { fontSize: 12, color: '#333', fontWeight: '600', marginTop: 1 },
  bubbleHint: { fontSize: 9, color: '#999', marginTop: 2 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: SCREEN_WIDTH - 40,
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 16,
  },
  originalImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  modalInfo: {
    width: '100%',
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalDate: { fontSize: 13, color: '#999', marginBottom: 4 },
  modalDesc: { fontSize: 15, color: '#333', fontWeight: '600', marginBottom: 4 },
  modalPlace: { fontSize: 13, color: '#666' },
  closeBtn: {
    marginTop: 16,
    backgroundColor: '#FFB366',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  closeBtnText: { color: 'white', fontWeight: '600', fontSize: 15 },
});
