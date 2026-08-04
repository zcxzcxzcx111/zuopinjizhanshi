import { registerRootComponent } from 'expo';

import App from './App';

function ensureMeta(name: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}

function ensureLink(rel: string, href: string, sizes?: string): void {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
  if (sizes) element.sizes = sizes;
}

function configurePwa(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  document.documentElement.lang = 'zh-CN';
  ensureLink('manifest', '/manifest.json');
  ensureLink('apple-touch-icon', '/icons/apple-touch-icon.png', '180x180');
  ensureMeta('theme-color', '#F4F1EA');
  ensureMeta('description', '在地图上记录你的每一段旅程回忆');
  ensureMeta('mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-status-bar-style', 'default');
  ensureMeta('apple-mobile-web-app-title', 'MemoryMap');
  ensureMeta('format-detection', 'telephone=no');

  if ('serviceWorker' in navigator) {
    // Directly unregister all service workers and clear caches
    // without triggering any reloads to avoid infinite loops
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => undefined);
      }
    }).catch(() => undefined);

    if ('caches' in window) {
      caches.keys().then((keys) => {
        Promise.all(keys.map((key) => caches.delete(key))).catch(() => undefined);
      }).catch(() => undefined);
    }
  }
}

configurePwa();

// Expo's web root registration mounts the React Native Web application.
registerRootComponent(App);
