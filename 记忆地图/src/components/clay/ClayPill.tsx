import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { clayColors, clayRadii, clayTypography } from '../../theme/clayTheme';

interface ClayPillProps {
  label: string;
  color?: string;
  bgColor?: string;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  size?: 'sm' | 'md';
}

export default function ClayPill({
  label,
  color = clayColors.accent,
  bgColor = 'rgba(124, 58, 237, 0.12)',
  style,
  textStyle,
  size = 'md',
}: ClayPillProps) {
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: bgColor,
          paddingHorizontal: size === 'sm' ? 10 : 14,
          paddingVertical: size === 'sm' ? 4 : 6,
          borderRadius: clayRadii.pill,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color, fontSize: size === 'sm' ? 11 : 13 },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: clayTypography.subhead.fontFamily,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
