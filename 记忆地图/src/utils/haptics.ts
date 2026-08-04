import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Triggers a light haptic feedback.
 * Safely handles web fallback where navigator.vibrate might not be available or supported.
 */
export const triggerLightHaptic = () => {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(10); // 10ms light vibration
      } catch (e) {
        // ignore
      }
    }
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
};
