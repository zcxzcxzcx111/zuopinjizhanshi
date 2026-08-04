import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

interface IPhoneAirFrameProps {
  children: React.ReactNode;
}

export default function IPhoneAirFrame({ children }: IPhoneAirFrameProps) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    let styleEl = document.getElementById('memory-map-global-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'memory-map-global-style';
      styleEl.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        html, body, #root, #main {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
        * { box-sizing: border-box; }
        @keyframes industrial-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .industrial-pulse {
          animation: industrial-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  return <View style={styles.viewport}>{children}</View>;
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
  } as any,
});
