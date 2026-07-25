import { Capacitor, registerPlugin } from '@capacitor/core';

// SystemBars ships inside Capacitor 8 itself (no separate npm plugin):
// style 'DARK' means light icons for dark backgrounds, 'LIGHT' the reverse.
const SystemBars = Capacitor.isNativePlatform() ? registerPlugin('SystemBars') : null;

const prefersDark = () =>
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

// The top bar has no distinct chrome color in this theme — it sits flush on
// --af-bg on every screen, same as the Android gesture bar — so both native
// bars just follow the OS color scheme. Android resets both bars to the
// theme default on rotation/theme changes, so callers should re-apply then too.
export function applySystemBars() {
  if (!SystemBars) return;
  const bgStyle = prefersDark() ? 'DARK' : 'LIGHT';
  SystemBars.setStyle({ style: bgStyle, bar: 'StatusBar' }).catch(() => {});
  if (Capacitor.getPlatform() === 'android') {
    // iOS ignores the bar argument (setStyle always targets the status bar),
    // so only Android gets a NavigationBar call
    SystemBars.setStyle({ style: bgStyle, bar: 'NavigationBar' }).catch(() => {});
  }
}
