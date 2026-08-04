import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import { industrialColors, industrialRadii, industrialShadows, industrialTypography } from '../../theme/industrialTheme';

interface IndustrialButtonProps {
  title: string | React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'default' | 'lg';
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function IndustrialButton({
  title,
  onPress,
  variant = 'primary',
  size = 'default',
  style,
  textStyle,
  disabled = false,
  leftIcon,
  rightIcon,
}: IndustrialButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Height & padding scale
  const sizeStyles: ViewStyle = {
    height: size === 'sm' ? 42 : size === 'lg' ? 58 : 50,
    paddingHorizontal: size === 'sm' ? 16 : size === 'lg' ? 28 : 22,
    borderRadius: industrialRadii.md,
  };

  // Shadow & Background
  let bgStyle: ViewStyle = {};
  let shadowStyle: any = isPressed ? industrialShadows.pressed : isHovered ? industrialShadows.floating : industrialShadows.card;
  let fontColor = industrialColors.textPrimary;

  if (variant === 'primary' || variant === 'danger') {
    bgStyle = { backgroundColor: industrialColors.accent };
    shadowStyle = isPressed ? industrialShadows.pressed : industrialShadows.orangeButton;
    fontColor = industrialColors.textOnAccent;
  } else if (variant === 'secondary') {
    bgStyle = { backgroundColor: industrialColors.chassis };
    fontColor = industrialColors.textPrimary;
  } else if (variant === 'ghost') {
    bgStyle = { backgroundColor: isHovered ? 'rgba(45, 52, 54, 0.06)' : 'transparent' };
    shadowStyle = isPressed ? industrialShadows.pressed : {};
    fontColor = industrialColors.textMuted;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.92}
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
            { translateY: isPressed ? 2 : isHovered ? -1 : 0 },
          ],
        },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
      {typeof title === 'string' ? (
        <Text
          style={[
            styles.text,
            { color: fontColor, fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 14 },
            textStyle,
          ]}
        >
          {title.toUpperCase()}
        </Text>
      ) : (
        title
      )}
      {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  text: {
    fontFamily: industrialTypography.hero.fontFamily,
    fontWeight: '700',
    letterSpacing: 1.0,
  },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
});
