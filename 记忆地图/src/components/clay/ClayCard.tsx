import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { clayColors, clayRadii, clayShadows } from '../../theme/clayTheme';

interface ClayCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'card' | 'surface' | 'glass';
  radius?: number;
  showBlobs?: boolean;
}

export default function ClayCard({
  children,
  style,
  variant = 'card',
  radius = clayRadii.card,
  showBlobs = false,
}: ClayCardProps) {
  const shadowStyle = variant === 'surface' ? clayShadows.surface : clayShadows.card;
  const bgStyle = variant === 'surface' ? { backgroundColor: '#FFFFFF' } : { backgroundColor: clayColors.cardBg };

  return (
    <View
      style={[
        styles.container,
        { borderRadius: radius },
        bgStyle,
        shadowStyle,
        style,
      ]}
    >
      {/* Zero-gravity floating 3D ambient blobs behind card content */}
      {showBlobs && Platform.OS === 'web' && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {/* @ts-ignore className is supported on Web */}
          <View
            style={[styles.blob, styles.blob1]}
            // @ts-ignore
            className="clay-blob-1"
          />
          {/* @ts-ignore */}
          <View
            style={[styles.blob, styles.blob2]}
            // @ts-ignore
            className="clay-blob-2"
          />
          {/* @ts-ignore */}
          <View
            style={[styles.blob, styles.blob3]}
            // @ts-ignore
            className="clay-blob-3"
          />
        </View>
      )}

      {/* Content Layer */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    // @ts-ignore
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    borderWidth: Platform.OS === 'web' ? 1.5 : 0.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  content: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    height: '100%',
  },
  blob: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.16,
    // @ts-ignore
    filter: 'blur(40px)',
  },
  blob1: {
    backgroundColor: '#7C3AED',
    top: -40,
    left: -40,
  },
  blob2: {
    backgroundColor: '#DB2777',
    bottom: -50,
    right: -40,
  },
  blob3: {
    backgroundColor: '#0EA5E9',
    top: '35%',
    right: '20%',
    width: 180,
    height: 180,
  },
});
