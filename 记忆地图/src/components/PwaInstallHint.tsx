import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { minimalistColors, minimalistRadii, minimalistShadows } from '../theme/minimalistTheme';

const DISMISSED_KEY = 'memory-map:pwa-hint-dismissed';

function shouldShowInstallHint(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent;
  const isIphone = /iPhone|iPod/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  const isStandalone = navigatorWithStandalone.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;

  try {
    return isIphone && isSafari && !isStandalone && localStorage.getItem(DISMISSED_KEY) !== '1';
  } catch {
    return isIphone && isSafari && !isStandalone;
  }
}

export default function PwaInstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(shouldShowInstallHint());
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {}
    setVisible(false);
  };

  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>↑</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>安装到 iPhone</Text>
        <Text style={styles.description}>点击 Safari 分享按钮，然后选择“添加到主屏幕”</Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="关闭安装提示"
        onPress={dismiss}
        style={styles.closeButton}
      >
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 104,
    zIndex: 2000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: minimalistRadii.lg,
    backgroundColor: minimalistColors.surface,
    borderWidth: 1,
    borderColor: minimalistColors.border,
    ...minimalistShadows.floating,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: minimalistColors.accent,
  },
  icon: { color: minimalistColors.textOnAccent, fontSize: 20, fontWeight: '700' },
  copy: { flex: 1 },
  title: { color: minimalistColors.textPrimary, fontSize: 14, fontWeight: '700' },
  description: { color: minimalistColors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 2 },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: minimalistColors.textSecondary, fontSize: 22, lineHeight: 24 },
});
