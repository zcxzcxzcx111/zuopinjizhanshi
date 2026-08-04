import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { industrialColors, industrialRadii, industrialShadows, industrialTypography } from '../../theme/industrialTheme';

interface IndustrialDataSlotProps {
  label?: string;
  value?: string | React.ReactNode;
  subValue?: string;
  style?: ViewStyle | ViewStyle[];
  valueStyle?: TextStyle;
  mono?: boolean;
  statusLed?: 'green' | 'red' | 'amber' | null;
}

export default function IndustrialDataSlot({
  label,
  value,
  subValue,
  style,
  valueStyle,
  mono = true,
  statusLed = null,
}: IndustrialDataSlotProps) {
  return (
    <View style={styles.wrapper}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label.toUpperCase()}</Text>
          {statusLed && (
            <View
              style={[
                styles.led,
                statusLed === 'green' && styles.ledGreen,
                statusLed === 'red' && styles.ledRed,
                statusLed === 'amber' && styles.ledAmber,
              ]}
            />
          )}
        </View>
      ) : null}
      <View style={[styles.slot, industrialShadows.recessed, style]}>
        {typeof value === 'string' ? (
          <Text
            style={[
              mono ? styles.valueMono : styles.valueSans,
              valueStyle,
            ]}
          >
            {value}
          </Text>
        ) : (
          value
        )}
        {subValue ? <Text style={styles.subValue}>{subValue}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 6,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  label: {
    fontFamily: industrialTypography.labelMono.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: industrialColors.textMuted,
  },
  slot: {
    backgroundColor: industrialColors.recessed,
    borderRadius: industrialRadii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  valueMono: {
    fontFamily: industrialTypography.mono.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: industrialColors.textPrimary,
  },
  valueSans: {
    fontFamily: industrialTypography.bodyLarge.fontFamily,
    fontSize: 15,
    fontWeight: '600',
    color: industrialColors.textPrimary,
  },
  subValue: {
    fontFamily: industrialTypography.mono.fontFamily,
    fontSize: 11,
    color: industrialColors.textMuted,
    marginTop: 4,
  },
  led: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ledGreen: {
    backgroundColor: industrialColors.ledGreen,
    ...industrialShadows.ledGreen,
  },
  ledRed: {
    backgroundColor: industrialColors.ledRed,
    ...industrialShadows.ledRed,
  },
  ledAmber: {
    backgroundColor: industrialColors.ledAmber,
  },
});
