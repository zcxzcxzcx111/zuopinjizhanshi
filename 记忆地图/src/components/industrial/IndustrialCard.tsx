import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { industrialColors, industrialRadii, industrialShadows } from '../../theme/industrialTheme';

interface IndustrialCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'panel' | 'chassis' | 'dark' | 'recessed';
  radius?: number;
}

export default function IndustrialCard({
  children,
  style,
  variant = 'panel',
  radius = industrialRadii.lg,
}: IndustrialCardProps) {
  let bgStyle: ViewStyle = { backgroundColor: industrialColors.chassis };
  let shadowStyle: ViewStyle = industrialShadows.card;

  if (variant === 'chassis') {
    bgStyle = { backgroundColor: industrialColors.chassis };
    shadowStyle = {};
  } else if (variant === 'dark') {
    bgStyle = { backgroundColor: industrialColors.darkPanel };
    shadowStyle = industrialShadows.floating;
  } else if (variant === 'recessed') {
    bgStyle = { backgroundColor: industrialColors.recessed };
    shadowStyle = industrialShadows.recessed;
  }

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
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  content: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    height: '100%',
  },
});
