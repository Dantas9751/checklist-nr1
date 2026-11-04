"""Converte os PNG de uma pasta para WebP e apaga os PNG."""
import pathlib, sys
from PIL import Image

for png in pathlib.Path(sys.argv[1]).glob('*.png'):
    Image.open(png).save(png.with_suffix('.webp'), 'WEBP', quality=82, method=6)
    png.unlink()
    print(png.with_suffix('.webp').name)
