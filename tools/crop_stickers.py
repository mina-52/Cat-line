"""Cut the 24 stickers out of assets/sticker_sheet.jpg into transparent PNGs."""
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

im = Image.open('assets/sticker_sheet.jpg').convert('RGB')
a = np.asarray(im).astype(int)
xs = [30, 275, 527, 780, 1030]
ys = [45, 295, 545, 800, 1050, 1300, 1545]
names = ["ohayo", "ohayonya", "oyasumi", "oyasuminya", "e", "waa", "goron", "nadete",
         "ganbaru", "ryokai", "hima", "sukinya", "muu", "chira", "ehe", "ittekimasu",
         "itterasshai", "matane", "hatena", "pero", "iine", "daisuki", "gaan", "zutto"]
k = 0
for r in range(6):
    for c in range(4):
        cell = a[ys[r]:ys[r + 1], xs[c]:xs[c + 1]]
        nonwhite = cell.min(axis=2) < 235
        lab, n = ndimage.label(nonwhite)
        sizes = ndimage.sum(nonwhite, lab, range(1, n + 1))
        keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 30])
        yy, xx = np.where(keep)
        pad = 6
        y0, x0 = max(0, yy.min() - pad), max(0, xx.min() - pad)
        y1, x1 = min(cell.shape[0], yy.max() + pad), min(cell.shape[1], xx.max() + pad)
        crop = cell[y0:y1, x0:x1]
        # background = near-white region connected to the crop border
        lab, n = ndimage.label(crop.min(axis=2) > 232)
        border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        fg = ndimage.binary_fill_holes(~np.isin(lab, list(border)))
        alpha = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
        out = Image.fromarray(crop.astype(np.uint8)).convert('RGBA')
        out.putalpha(alpha)
        out.save(f'assets/stickers/{k + 1:02d}_{names[k]}.png')
        k += 1
