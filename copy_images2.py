import shutil
import os

src_dir = r"C:\Users\90823\.gemini\antigravity\brain\786157f3-afcb-46f3-9158-4ba8f28d8533\.user_uploaded"
dest_dir = r"C:\Users\90823\Desktop\所有文件\AI项目\作品展示页 2\assets"

files = [
    ("media__1785735472811.jpg", "memory-map-demo-5.jpg"),
    ("media__1785735476952.jpg", "memory-map-demo-6.jpg")
]

for src_name, dest_name in files:
    src_path = os.path.join(src_dir, src_name)
    dest_path = os.path.join(dest_dir, dest_name)
    shutil.copy2(src_path, dest_path)
    print(f"Copied {src_name} to {dest_name}")
