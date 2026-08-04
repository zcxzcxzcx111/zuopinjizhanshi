import React, { useState } from 'react';
import { TextInput, TextInputProps, StyleSheet, View, Text } from 'react-native';
import { clayColors, clayRadii, clayShadows, clayTypography } from '../../theme/clayTheme';

interface ClayInputProps extends TextInputProps {
  label?: string;
}

export default function ClayInput({ label, style, ...props }: ClayInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...props}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus && props.onFocus(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur && props.onBlur(e);
        }}
        placeholderTextColor={clayColors.textSecondary}
        style={[
          styles.input,
          isFocused ? styles.inputFocused : styles.inputRecessed,
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginVertical: 6,
  },
  label: {
    fontFamily: clayTypography.subhead.fontFamily,
    fontSize: 14,
    fontWeight: '700',
    color: clayColors.textPrimary,
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    height: 56,
    borderRadius: clayRadii.input,
    paddingHorizontal: 20,
    fontSize: 16,
    fontFamily: clayTypography.body.fontFamily,
    color: clayColors.textPrimary,
  },
  inputRecessed: {
    backgroundColor: clayColors.inputBg,
    ...clayShadows.pressed,
  },
  inputFocused: {
    backgroundColor: '#FFFFFF',
    ...clayShadows.card,
    borderWidth: 2,
    borderColor: clayColors.accent,
  },
});
