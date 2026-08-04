import struct

def get_image_info(filepath):
    with open(filepath, 'rb') as f:
        data = f.read()
        
    size = len(data)
    height = -1
    width = -1
    content_type = ''
    
    # handle JPEGs
    if (size >= 2) and data.startswith(b'\xff\xd8'):
        content_type = 'image/jpeg'
        try:
            f.seek(0)
            f.read(2)
            b = f.read(1)
            while (b and ord(b) != 0xDA):
                while (ord(b) != 0xFF): b = f.read(1)
                while (ord(b) == 0xFF): b = f.read(1)
                if (ord(b) >= 0xC0 and ord(b) <= 0xC3):
                    f.read(3)
                    h, w = struct.unpack(">HH", f.read(4))
                    break
                else:
                    f.read(int(struct.unpack(">H", f.read(2))[0])-2)
                b = f.read(1)
            width = int(w)
            height = int(h)
        except Exception:
            pass
            
    print(f"{filepath}: {width}x{height}")

for i in range(1, 5):
    path = f"assets/memory-map-demo-{i}.jpg"
    get_image_info(path)
