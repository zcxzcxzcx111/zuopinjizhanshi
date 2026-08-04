import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Platform } from 'react-native';
import { industrialColors, industrialRadii, industrialShadows, industrialTypography } from '../../theme/industrialTheme';

interface IndustrialLedProps {
  status?: 'green' | 'red' | 'amber';
  label?: string;
  pulse?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export default function IndustrialLed({
  status = 'green',
  label,
  pulse = true,
  style,
}: IndustrialLedProps) {
  let ledColor = industrialColors.ledGreen;
  let shadowStyle: any = industrialShadows.ledGreen;

  if (status === 'red') {
    ledColor = industrialColors.ledRed;
    shadowStyle = industrialShadows.ledRed;
  } else if (status === 'amber') {
    ledColor = industrialColors.ledAmber;
    shadowStyle = {};
  }

  return (
    <View style={[styles.container, style]}>
      <View
        // @ts-ignore
        className={pulse && Platform.OS === 'web' ? 'industrial-pulse' : undefined}
        style={[
          styles.led,
          { backgroundColor: ledColor },
          shadowStyle,
        ]}
      />
      {label ? <Text style={styles.label}>{label.toUpperCase()}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  led: {
    width: 10,
    height: 10,
    borderRadius: industrialRadii.pill,
  },
  label: {
    fontFamily: industrialTypography.labelMono.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: industrialColors.textMuted,
  },
});
