// Detects whether the player is on a touch device (mobile/tablet) or a computer.
export function isTouchDevice() {
  return typeof window !== 'undefined' && (('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0);
}

export function deviceLabel() {
  return isTouchDevice() ? 'Mobile' : 'Computer';
}