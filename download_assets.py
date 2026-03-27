import os
import urllib.request
import urllib.error

os.makedirs('assets', exist_ok=True)

categories = ['overall', 'ltms', 'vanilla', 'uhc', 'pot', 'nethop', 'smp', 'sword', 'axe', 'mace']

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

for cat in categories:
    paths = [
        f"https://mctiers.com/tier_icons/{cat}.svg",
        f"https://mctiers.com/nav_icons/{cat}.svg",
        f"https://mctiers.com/{cat}.svg"
    ]
    
    downloaded = False
    for p in paths:
        try:
            req = urllib.request.Request(p, headers=headers)
            data = urllib.request.urlopen(req).read()
            with open(f"assets/{cat}.svg", "wb") as f:
                f.write(data)
            print(f"Downloaded {cat}.svg from {p}")
            downloaded = True
            break
        except urllib.error.HTTPError:
            continue
        except Exception as e:
            print("Error:", e)
    
    if not downloaded:
        print(f"Could not find SVG for {cat}")
