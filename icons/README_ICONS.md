# Extension Icons

This directory should contain the extension icons in PNG format.

## Required Icons

- **icon16.png**: 16x16 pixels - Used in the extension management page
- **icon48.png**: 48x48 pixels - Used in the extensions management page
- **icon128.png**: 128x128 pixels - Used in the Chrome Web Store and during installation

## Creating Icons

You can create these icons using any image editing software. Here are some suggestions:

### Design Ideas
- Use a symbol representing dual/double (like two parallel lines)
- Incorporate a subtitle symbol (like text boxes or speech bubbles)
- Use colors that relate to translation or languages
- Keep it simple and recognizable at small sizes

### Tools
- **Figma** (free, web-based): https://figma.com
- **Canva** (free templates): https://canva.com
- **GIMP** (free, desktop): https://gimp.org
- **Online Icon Generators**: Search for "chrome extension icon generator"

### Quick Placeholder

For development/testing, you can use online tools to generate simple colored squares:
1. Go to https://placeholder.com/
2. Generate 16x16, 48x48, and 128x128 images
3. Save them as icon16.png, icon48.png, icon128.png
4. Place them in this directory

### Temporary Solution

You can also use any existing PNG images temporarily:
```bash
# Create simple colored squares using ImageMagick (if installed)
convert -size 16x16 xc:#667eea icon16.png
convert -size 48x48 xc:#667eea icon48.png
convert -size 128x128 xc:#667eea icon128.png
```

Or use Python with PIL:
```python
from PIL import Image

for size in [16, 48, 128]:
    img = Image.new('RGB', (size, size), color='#667eea')
    img.save(f'icon{size}.png')
```

## Note

The extension will not load without these icon files. Make sure to create them before testing!
