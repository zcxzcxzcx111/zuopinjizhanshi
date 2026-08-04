import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, Platform, View } from 'react-native';
import { clayColors, clayRadii, clayShadows, clayTypography } from '../../theme/clayTheme';

interface ClayButtonProps {
  title: string | React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'candy';
  size?: 'sm' | 'default' | 'lg';
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  disabled?: boolean;
}

export default function ClayButton({
  title,
  onPress,
  variant = 'primary',
  size = 'default',
  style,
  textStyle,
  disabled = false,
}: ClayButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Height & padding scale
  const sizeStyles: ViewStyle = {
    height: size === 'sm' ? 44 : size === 'lg' ? 64 : 56,
    paddingHorizontal: size === 'sm' ? 16 : size === 'lg' ? 32 : 24,
    borderRadius: clayRadii.button,
  };

  // Shadow & Background
  let bgStyle: ViewStyle = {};
  let shadowStyle: any = isPressed ? clayShadows.pressed : isHovered ? clayShadows.buttonHover : clayShadows.button;
  let fontColor = '#FFFFFF';

  if (variant === 'primary' || variant === 'candy') {
    if (Platform.OS === 'web') {
      bgStyle = {
        // @ts-ignore
        backgroundImage: variant === 'candy' 
          ? 'linear-gradient(135deg, #EC4899 0%, #7C3AED 100%)'
          : 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
      };
    } else {
      bgStyle = { backgroundColor: variant === 'candy' ? '#C026D3' : clayColors.accent };
    }
  } else if (variant === 'secondary') {
    bgStyle = { backgroundColor: '#FFFFFF' };
    fontColor = clayColors.textPrimary;
  } else if (variant === 'outline') {
    bgStyle = {
      backgroundColor: isHovered ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
      borderWidth: 2,
      borderColor: clayColors.accent,
    };
    shadowStyle = {};
    fontColor = clayColors.accent;
  } else if (variant === 'ghost') {
    bgStyle = { backgroundColor: isHovered ? 'rgba(124, 58, 237, 0.1)' : 'transparent' };
    shadowStyle = {};
    fontColor = clayColors.textPrimary;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      // @ts-ignore - Web hover handlers
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={[
        styles.base,
        sizeStyles,
        bgStyle,
        shadowStyle,
        {
          transform: [
            { scale: isPressed ? 0.92 : isHovered ? 1.02 : 1 },
            { translateY: isPressed ? 2 : isHovered ? -3 : 0 },
          ],
        },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {typeof title === 'string' ? (
        <Text
          style={[
            styles.text,
            { color: fontColor, fontSize: size === 'sm' ? 14 : size === 'lg' ? 18 : 16 },
            textStyle,
          ]}
        >
          {title}
        </Text>
      ) : (
        title
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: clayTypography.body.fontFamily,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
