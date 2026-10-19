# Straightens the sleeve photos into textures for box.glb: finds each panel's four corners from the cut-out's outline
# (background already removed), warps it to an exact rectangle, and fills any pixel the photo didn't cover with the
# nearest panel colour, so no white or dark slivers show at the edges of the 3D box.
#   python3 tools/ekmaati/rectify.py        (reads work/ekmaati/fx/real/sleeve-*@2x.webp, writes work/ekmaati/fx/tex/s_front|back|left.webp)
import numpy as np
from PIL import Image, ImageFilter
R, T = "work/ekmaati/fx/real/", "work/ekmaati/fx/tex/"
W, H = 768, 1152
INSET = 0.004   # trim a hair inside the found outline, where the cut-out edge is soft

def corners(alpha):
    ys, xs = np.nonzero(alpha > 160)
    s, d = xs + ys, xs - ys
    tl = (xs[s.argmin()], ys[s.argmin()]); br = (xs[s.argmax()], ys[s.argmax()])
    tr = (xs[d.argmax()], ys[d.argmax()]); bl = (xs[d.argmin()], ys[d.argmin()])
    return [np.array(p, float) for p in (tl, tr, br, bl)]

def coeffs(dst, src):   # PIL perspective: maps output (dst) points to input (src) points
    A, b = [], []
    for (x, y), (u, v) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]; b += [u, v]
    return np.linalg.solve(np.array(A, float), np.array(b, float))

for name in ("front", "back", "left"):   # sleeve-right was shot at three quarters (the back shows too), so s_right stays as it was
    im = Image.open(f"{R}sleeve-{name}@2x.webp").convert("RGBA")
    a = np.array(im)[:, :, 3]
    tl, tr, br, bl = corners(a)
    c = (tl + tr + br + bl) / 4
    tl, tr, br, bl = [p + (c - p) * INSET * 2 for p in (tl, tr, br, bl)]
    out = im.transform((W, H), Image.PERSPECTIVE, coeffs([(0, 0), (W, 0), (W, H), (0, H)], [tl, tr, br, bl]), Image.BICUBIC)
    # fill uncovered pixels (alpha < 255) from their neighbours, growing inward from the panel
    px = np.array(out).astype(float)
    rgb, al = px[:, :, :3], px[:, :, 3:] / 255
    for _ in range(40):
        if al.min() > 0.999: break
        blur = np.array(Image.fromarray((rgb * al).astype(np.uint8)).filter(ImageFilter.BoxBlur(3))).astype(float)
        wb = np.array(Image.fromarray((al[:, :, 0] * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(3))).astype(float)[:, :, None] / 255
        fill = np.where(wb > 0.01, blur / np.maximum(wb, 0.01), rgb)
        rgb = rgb * al + fill * (1 - al); al = np.maximum(al, (wb > 0.01).astype(float))
    Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).save(f"{T}s_{name}.webp", quality=90)
    print(name, [tuple(np.round(p).astype(int)) for p in (tl, tr, br, bl)])
