import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { minimalistTypography } from '../theme/minimalistTheme';

export type QueueState = {
  type: 'idle' | 'generating' | 'success' | 'error';
  message?: string;
};

interface DynamicIslandProps {
  state: QueueState;
  markerCount: number;
}

export default function DynamicIsland({ state, markerCount }: DynamicIslandProps) {
  const widthAnim = useRef(new Animated.Value(240)).current;
  const heightAnim = useRef(new Animated.Value(44)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    let targetWidth = 240;
    let targetHeight = 44;
    let targetOpacity = 1;
    let targetScale = 1;

    if (state.type === 'idle') {
      targetOpacity = 0;
      targetScale = 0.9;
    }

    Animated.parallel([
      Animated.spring(widthAnim, { toValue: targetWidth, useNativeDriver: false, friction: 8, tension: 60 }),
      Animated.spring(heightAnim, { toValue: targetHeight, useNativeDriver: false, friction: 8, tension: 60 }),
      Animated.spring(scaleAnim, { toValue: targetScale, useNativeDriver: true, friction: 8, tension: 60 }),
      Animated.timing(opacityAnim, { toValue: targetOpacity, duration: 200, useNativeDriver: true })
    ]).start();
  }, [state.type, widthAnim, heightAnim, opacityAnim, scaleAnim]);

  // If idle and animation is done (roughly), we can still render it but it will be transparent
  // PointerEvents='none' prevents it from blocking touches when hidden
  return (
    <Animated.View 
      style={[
        styles.capsule, 
        { 
          width: widthAnim, 
          height: heightAnim, 
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
      pointerEvents={state.type === 'idle' ? 'none' : 'auto'}
    >
      {state.type === 'idle' ? (
        <View style={styles.contentRow}>
          <Text style={styles.brandText}>MemoryMap</Text>
          <View style={styles.dot} />
          <Text style={styles.countText} numberOfLines={1}>{markerCount} 地点</Text>
        </View>
      ) : (
        <View style={styles.contentRow}>
          {state.type === 'generating' && <ActivityIndicator size="small" color="#fff" />}
          {state.type === 'success' && <Text style={styles.icon}>✅</Text>}
          {state.type === 'error' && <Text style={styles.icon}>❌</Text>}
          <Text style={styles.messageText} numberOfLines={1}>
            {state.message}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  capsule: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: '#000', // True dynamic island is black
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandText: {
    ...minimalistTypography.caption,
    color: '#fff',
    fontWeight: '600',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 8,
  },
  countText: {
    ...minimalistTypography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
  },
  messageText: {
    ...minimalistTypography.caption,
    color: '#fff',
    marginLeft: 6,
    fontWeight: '500',
  },
});
