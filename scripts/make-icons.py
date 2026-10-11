"""Build Spendy icons from the ribbon mark in brand/spendy-mark.png."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MARK = ROOT / "brand" / "spendy-mark.png"
WHITE = (255, 255, 255, 255)
CREAM = (250, 249, 246, 255)


def content_bbox(im: Image.Image) -> tuple[int, int, int, int]:
    px = im.load()
    w, h = im.size
    minx, miny, maxx, maxy = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 16 and min(r, g, b) < 232:
                found = True
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if not found:
        raise SystemExit("mark has no content")
    pad = 8
    return (
        max(0, minx - pad),
        max(0, miny - pad),
        min(w, maxx + 1 + pad),
        min(h, maxy + 1 + pad),
    )


def knock_out_white(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            low = min(r, g, b)
            spread = max(r, g, b) - low
            if low >= 248 and spread < 14:
                px[x, y] = (r, g, b, 0)
            elif low >= 232 and spread < 12:
                fade = (248 - low) / 16
                px[x, y] = (r, g, b, int(a * fade))
    return im


def cut_mark() -> Image.Image:
    im = Image.open(MARK).convert("RGBA")
    return knock_out_white(im.crop(content_bbox(im)))


def place(mark: Image.Image, size: int, fill: float, background: tuple[int, int, int, int]) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), background)
    longer = max(mark.size)
    scale = (fill * size) / longer
    resized = mark.resize(
        (max(1, round(mark.width * scale)), max(1, round(mark.height * scale))),
        Image.Resampling.LANCZOS,
    )
    x = (size - resized.width) // 2
    y = (size - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def monochrome(mark: Image.Image, size: int) -> Image.Image:
    placed = place(mark, size, 0.62, (0, 0, 0, 0))
    px = placed.load()
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    op = out.load()
    for y in range(size):
        for x in range(size):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            alpha = min(255, int((255 - min(r, g, b)) * 1.35 * (a / 255)))
            if alpha < 12:
                continue
            op[x, y] = (255, 255, 255, alpha)
    return out


def save(im: Image.Image, path: Path, rgb: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    (im.convert("RGB") if rgb else im).save(path, "PNG")


def main() -> None:
    mark = cut_mark()
    # The ribbon stays inside the maskable circle (center 80% of the icon).
    for size in (48, 180, 192, 512):
        icon = place(mark, size, 0.72, WHITE)
        if size == 48:
            save(icon, ROOT / "public" / "favicon.png")
        else:
            save(icon, ROOT / "public" / f"icon-{size}.png")
    save(place(mark, 1024, 0.72, WHITE), ROOT / "store" / "icon-1024.png", rgb=True)

    expo = Path.home() / "vmeste-expo" / "assets"
    if expo.is_dir():
        save(place(mark, 1024, 0.72, WHITE), expo / "icon.png", rgb=True)
        save(place(mark, 48, 0.72, WHITE), expo / "favicon.png")
        save(place(mark, 1024, 0.42, WHITE), expo / "splash-icon.png", rgb=True)
        save(place(mark, 512, 0.58, (0, 0, 0, 0)), expo / "android-icon-foreground.png")
        save(Image.new("RGBA", (512, 512), WHITE), expo / "android-icon-background.png")
        save(monochrome(mark, 432), expo / "android-icon-monochrome.png")


if __name__ == "__main__":
    main()
