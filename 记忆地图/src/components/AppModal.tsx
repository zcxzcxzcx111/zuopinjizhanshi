import React from 'react';
import { ModalProps, View, StyleSheet } from 'react-native';
import { industrialColors, industrialShadows } from '../theme/industrialTheme';

export default function AppModal(props: ModalProps) {
  if (!props.visible) {
    return null;
  }

  // Web 端：工业拟物控制台弹窗底盘封装 (ABS Chassis Level 0)
  return (
    <View style={styles.webOverlay}>
      <View style={[styles.webContainer, industrialShadows.floating]}>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    backgroundColor: 'rgba(28, 32, 38, 0.6)', // Deep industrial dark overlay
    // @ts-ignore
    backdropFilter: 'blur(4px)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  webContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: industrialColors.chassis,
    overflow: 'hidden',
    position: 'relative',
  },
});
