import os
from PIL import Image
import sys

# Change to the public directory
public_dir = r"c:\Users\hp\Desktop\python_learning\academy-app\public"
os.chdir(public_dir)

logo_path = "logo.png"

# Ensure the logo exists
if not os.path.exists(logo_path):
    print("logo.png not found")
    sys.exit(1)

# Ensure icons directory exists
icons_dir = "icons"
if not os.path.exists(icons_dir):
    os.makedirs(icons_dir)

sizes = [72, 96, 128, 144, 152, 192, 384, 512]

try:
    with Image.open(logo_path) as img:
        # Convert to RGBA just to be safe with transparency
        img = img.convert("RGBA")
        
        for size in sizes:
            # Create a square canvas since PWA icons are usually square
            # We will paste the resized logo in the center
            
            # First calculate aspect ratio
            aspect = img.width / img.height
            if img.width > img.height:
                new_w = size
                new_h = int(size / aspect)
            else:
                new_h = size
                new_w = int(size * aspect)
                
            resized_logo = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
            # Create a transparent square canvas
            canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0)) # transparent background
            
            # Paste the resized logo in the middle
            x = (size - new_w) // 2
            y = (size - new_h) // 2
            canvas.paste(resized_logo, (x, y), resized_logo)
            
            # Save it
            icon_name = f"icon-{size}x{size}.png"
            canvas.save(os.path.join(icons_dir, icon_name), "PNG")
            print(f"Generated {icon_name}")
            
    print("All icons generated successfully.")
except Exception as e:
    print(f"Error: {e}")
