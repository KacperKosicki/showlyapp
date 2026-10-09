export function isAppleMobileBrowser(device = window.navigator) {
  return /iPhone|iPad|iPod/i.test(device.userAgent || '') ||
    (/Macintosh/i.test(device.userAgent || '') && device.maxTouchPoints > 1);
}

export function updateBrowserTheme(color) {
  // Only the visible promotion should tint iOS; otherwise let the page show through.
  const appleMobile = isAppleMobileBrowser();
  const betaVisible = document.documentElement.getAttribute('data-beta-banner-visible') === 'true';
  if (appleMobile && !betaVisible) {
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.remove());
    return;
  }
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', appleMobile ? '#d8ff72' : color);
}
