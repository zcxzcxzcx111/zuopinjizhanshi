import os
import shutil
import glob

src_dir = r"C:\Users\90823\.gemini\antigravity\brain\786157f3-afcb-46f3-9158-4ba8f28d8533\.user_uploaded"
dest_dir = r"C:\Users\90823\Desktop\所有文件\AI项目\作品展示页 2\assets"

files = glob.glob(os.path.join(src_dir, "*.jpg"))
files.sort(key=os.path.getmtime)

# We want the last 4 images
last_4 = files[-4:]

for i, f in enumerate(last_4):
    dest = os.path.join(dest_dir, f"memory-map-demo-{i+1}.jpg")
    shutil.copy2(f, dest)
    print(f"Copied {f} to {dest}")
