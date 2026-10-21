export function inspectPushEnvironment(win = window, nav = navigator) {
  const ios = /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  const standalone = nav.standalone === true || win.matchMedia?.('(display-mode: standalone)').matches;
  if (ios && !standalone) return 'ios-install';
  if (!win.isSecureContext) return 'insecure';
  if (!('Notification' in win) || !('serviceWorker' in nav) || !('PushManager' in win)) return 'unsupported';
  return win.Notification.permission;
}
