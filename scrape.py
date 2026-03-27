import urllib.request
import re
try:
    req = urllib.request.Request('https://mctiers.com/rankings/overall', headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req).read().decode('utf-8')
    svgs = re.findall(r'/tier_icons/[a-zA-Z0-9_]+\.svg', html) + re.findall(r'/[a-zA-Z0-9_]+\.svg', html) + re.findall(r'/[a-zA-Z0-9_]+/[a-zA-Z0-9_]+\.svg', html)
    # also look for static images
    print("ALL SVG MATCHES:")
    for m in set(svgs):
        print("https://mctiers.com" + m)
except Exception as e:
    print("ERROR:", e)
