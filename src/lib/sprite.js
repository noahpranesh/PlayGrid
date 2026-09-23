// Loads an image URL, removes a solid chroma-key background color, and
// returns a transparent canvas ready to drawImage. Cached per URL.
// Resolves null on any failure so callers can fall back to procedural art.

const cache = new Map();

export function loadSprite(url, key = [255, 0, 255], tol = 90) {
  if (cache.has(url)) return cache.get(url);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0);
        const data = x.getImageData(0, 0, c.width, c.height);
        const d = data.data;
        const feather = tol * 0.6;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] === 0) continue;
          const dist = Math.hypot(d[i] - key[0], d[i + 1] - key[1], d[i + 2] - key[2]);
          if (dist < tol) d[i + 3] = 0;
          else if (dist < tol + feather) {
            d[i + 3] = Math.min(d[i + 3], Math.round(((dist - tol) / feather) * 255));
          }
        }
        x.putImageData(data, 0, 0);
        resolve(c);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
  cache.set(url, p);
  return p;
}