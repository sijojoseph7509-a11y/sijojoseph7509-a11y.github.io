// Small pure helpers used by main.js: canvas drawing, easing curves, noise (split out of main.js in v103)

export function sharpen(img) {   // unsharp mask: the source photo is soft, this brings back edge detail (hair, eyes) without halos
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const src = g.getImageData(0, 0, c.width, c.height);
  g.filter = "blur(1.6px)"; g.drawImage(img, 0, 0); g.filter = "none";
  const bl = g.getImageData(0, 0, c.width, c.height), a = src.data, b = bl.data;
  for (let i = 0; i < a.length; i += 4) for (let k = 0; k < 3; k++) { const d = a[i + k] - b[i + k]; a[i + k] = Math.max(0, Math.min(255, a[i + k] + d * 0.9)); }
  g.putImageData(src, 0, 0); return c;
}

export const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

export function bezier(x1, y1, x2, y2) {
  const B = (t, a, b) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
  return (x) => {
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 22; i++) { t = (lo + hi) / 2; B(t, x1, x2) < x ? (lo = t) : (hi = t); }
    return B(t, y1, y2);
  };
}

export function tileNoise(size, period, rnd) {   // smooth value noise that wraps at the edges (period cells across)
  const grid = Array.from({ length: period * period }, rnd), out = new Float32Array(size * size);
  const at = (x, y) => grid[((y % period + period) % period) * period + ((x % period + period) % period)];
  const sm = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = (x / size) * period, fy = (y / size) * period, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy);
    const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * tx, b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * tx;
    out[y * size + x] = a + (b - a) * ty;
  }
  return out;
}

export function wrapText(g, text, x, y, maxW, lh) {
  let ln = "", yy = y;
  for (const word of text.split(" ")) { const t = ln ? ln + " " + word : word; if (g.measureText(t).width > maxW && ln) { g.fillText(ln, x, yy); ln = word; yy += lh; } else ln = t; }
  if (ln) g.fillText(ln, x, yy);
}
