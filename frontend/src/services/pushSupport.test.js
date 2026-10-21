import { inspectPushEnvironment } from './pushSupport';
test('iPhone tabs require Home Screen installation before requesting permission', () => {
  expect(inspectPushEnvironment({ isSecureContext: true }, { userAgent: 'iPhone', standalone: false })).toBe('ios-install');
});
test('installed iOS and supported Android browsers expose permission, insecure and unsupported contexts explain limits', () => {
  const win = { isSecureContext: true, Notification: { permission: 'granted' }, PushManager: {} };
  expect(inspectPushEnvironment(win, { userAgent: 'iPhone', standalone: true, serviceWorker: {} })).toBe('granted');
  expect(inspectPushEnvironment(win, { userAgent: 'Android', serviceWorker: {} })).toBe('granted');
  expect(inspectPushEnvironment({ ...win, isSecureContext: false }, { userAgent: 'Android' })).toBe('insecure');
  expect(inspectPushEnvironment({ isSecureContext: true }, { userAgent: 'Android' })).toBe('unsupported');
});
