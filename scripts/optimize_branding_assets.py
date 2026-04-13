from pathlib import Path

from PIL import Image

TARGETS = {
    "icon.png": 1024,
    "splash-icon.png": 1024,
    "favicon.png": 256,
    "android-icon-foreground.png": 1024,
}

ASSETS_DIR = Path("/home/ubuntu/horeca_mobile_app/assets/images")

for name, size in TARGETS.items():
    path = ASSETS_DIR / name
    with Image.open(path) as img:
        img = img.convert("RGBA")
        img = img.resize((size, size), Image.LANCZOS)
        alpha = img.getchannel("A")
        rgb = Image.new("RGB", img.size, (255, 255, 255))
        rgb.paste(img, mask=alpha)
        quantized = rgb.quantize(colors=192, method=Image.MEDIANCUT)
        quantized.save(path, format="PNG", optimize=True)
