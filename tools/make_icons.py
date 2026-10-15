"""Draw app icons (black + titanium "Aa" + a cursor bar)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "app" / "icons"
FONTS = ["/System/Library/Fonts/Helvetica.ttc", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"]


def font(size):
    for f in FONTS:
        try:
            return ImageFont.truetype(f, size, index=1) if f.endswith(".ttc") else ImageFont.truetype(f, size)
        except Exception:
            continue
    return ImageFont.load_default()


def draw(size, pad_ratio, rounded):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    r = int(size * 0.22) if rounded else 0
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=(14, 14, 16, 255))
    inner = int(size * pad_ratio)
    d.rounded_rectangle([inner, inner, size - inner, size - inner], radius=max(1, r - inner // 2),
                        outline=(58, 56, 51, 255), width=max(1, size // 128))
    f = font(int(size * 0.40))
    text = "Aa"
    bb = d.textbbox((0, 0), text, font=f)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    x, y = (size - w) / 2 - bb[0] - size * 0.04, (size - h) / 2 - bb[1] - size * 0.02
    d.text((x, y), text, font=f, fill=(201, 195, 182, 255))
    cx = x + w + size * 0.05 + bb[0]
    d.rectangle([cx, y + bb[1], cx + size * 0.035, y + bb[3]], fill=(111, 207, 151, 255))
    return im


draw(192, 0.08, True).save(OUT / "icon-192.png")
draw(512, 0.08, True).save(OUT / "icon-512.png")
draw(512, 0.16, False).save(OUT / "icon-maskable-512.png")
draw(180, 0.0001, False).convert("RGB").save(OUT / "apple-touch-icon.png")
print("ok")
