import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text, Image, TouchableOpacity } from 'react-native';
import { stickerShadow } from '../theme/appleTheme';

interface QCharacterProps {
  date: string;
  description: string;
  size?: number;
  showLabel?: boolean;
  onPress?: () => void;
  imageUri?: string;
  fallbackUri?: string;
}

export default function QCharacter({
  date,
  description,
  size = 80,
  showLabel = true,
  onPress,
  imageUri,
  fallbackUri,
}: QCharacterProps) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [floatAnim]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const renderCharacter = () => {
    const finalUri = imageUri || fallbackUri;
    // If it's a generated sticker, show it fully with shadow. Otherwise keep circle crop.
    const isSticker = !!imageUri;
    
    if (finalUri) {
      if (isSticker) {
        return (
          <Image 
            source={{ uri: finalUri }} 
            style={[{ width: size * 1.5, height: size * 1.5, marginBottom: -size * 0.2 }, stickerShadow as any]} 
            resizeMode="contain" 
          />
        );
      } else {
        return (
          <View style={[styles.imageWrapper, { width: size, height: size, borderRadius: size / 2 }]}>
            <Image source={{ uri: finalUri }} style={{ width: size, height: size }} resizeMode="cover" />
          </View>
        );
      }
    }

    // Default fallback
    return (
      <View style={[styles.fallbackChar, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={styles.fallbackEmoji}>🧍</Text>
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: floatAnim }] },
      ]}
    >
      {showLabel && (
        <View style={styles.bubble}>
          <Text style={styles.dateText}>{formatDate(date)}</Text>
          <Text style={styles.descText} numberOfLines={1}>
            {description}
          </Text>
        </View>
      )}

      {renderCharacter()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  bubble: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 140,
  },
  emoji: { fontSize: 16 },
  dateText: { fontSize: 11, color: '#666', marginTop: 2 },
  descText: { fontSize: 12, color: '#333', fontWeight: '600', marginTop: 1 },
  fallbackChar: {
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  fallbackEmoji: { textAlign: 'center' },
  imageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
