import { Capacitor } from '@capacitor/core';

export function isNative() {
  return Capacitor.isNativePlatform();
}

export async function buzz(kind) {
  try {
    const raw = JSON.parse(localStorage.getItem('hokkaido-powder-save-v1') || '{}');
    if (raw.haptics === false) return;
  } catch {
    /* default on */
  }
  if (isNative()) {
    try {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
      if (kind === 'crash') await Haptics.notification({ type: NotificationType.Error });
      else if (kind === 'land') await Haptics.impact({ style: ImpactStyle.Medium });
      else await Haptics.impact({ style: ImpactStyle.Light });
      return;
    } catch {
      /* fall through */
    }
  }
  const ms = kind === 'crash' ? [40, 30, 80] : kind === 'land' ? 25 : 12;
  navigator.vibrate?.(ms);
}

export async function bootNative(onActive) {
  if (!isNative()) return;
  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.hide();
  } catch {
    /* optional */
  }
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('appStateChange', ({ isActive }) => onActive(isActive));
  } catch {
    /* optional */
  }
}

export function autoQuality() {
  const mobile = window.matchMedia('(pointer: coarse)').matches;
  const mem = navigator.deviceMemory || (mobile ? 4 : 8);
  const cores = navigator.hardwareConcurrency || 4;
  const narrow = Math.min(window.screen.width, window.screen.height) < 380;
  if (mobile && (mem <= 3 || cores <= 4 && narrow)) return 'low';
  if (mobile) return 'medium';
  return mem >= 8 && cores >= 8 ? 'high' : 'medium';
}
