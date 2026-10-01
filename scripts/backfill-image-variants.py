# 이미 올라간 사진에 크기별 버전(.w400.jpg, .w800.jpg)을 만들어 올린다. 2026-10-01 한 번 실행함.
# 사용: python3 scripts/backfill-image-variants.py <임시폴더>  (macOS sips 필요, .env.local의 SUPABASE_SECRET_KEY 사용)
import json, os, subprocess, urllib.request, urllib.parse, sys
env = dict(l.strip().split('=',1) for l in open('/Users/ojihun/DEV/spoonie/.env.local') if '=' in l and not l.startswith('#'))
U = env['NEXT_PUBLIC_SUPABASE_URL']; S = env['SUPABASE_SECRET_KEY']
H = {'apikey': S, 'Authorization': f'Bearer {S}'}
def get(path):
    req = urllib.request.Request(U + path, headers=H); return json.load(urllib.request.urlopen(req))
PREFIX = U + '/storage/v1/object/public/item-images/'
urls = set()
for it in get('/rest/v1/items?select=image_urls'):
    for u in it['image_urls'] or []: urls.add(u)
for st in get('/rest/v1/instructions?select=image_url&image_url=not.is.null'):
    urls.add(st['image_url'])
paths = sorted(urllib.parse.unquote(u[len(PREFIX):].split('?')[0]) for u in urls if u and u.startswith(PREFIX))
print('referenced images:', len(paths))
tmp = sys.argv[1]; done = 0; bytes_full = bytes_400 = bytes_800 = 0
for p in paths:
    src = os.path.join(tmp, 'src.jpg')
    urllib.request.urlretrieve(PREFIX + urllib.parse.quote(p), src)
    bytes_full += os.path.getsize(src)
    for w in (400, 800):
        out = os.path.join(tmp, f'out{w}.jpg')
        subprocess.run(['sips', '-Z', str(w), '-s', 'format', 'jpeg', '-s', 'formatOptions', '78', src, '--out', out], check=True, capture_output=True)
        # 원본이 더 작으면 늘리지 않는다
        if os.path.getsize(out) > os.path.getsize(src): subprocess.run(['cp', src, out], check=True)
        data = open(out, 'rb').read()
        if w == 400: bytes_400 += len(data)
        else: bytes_800 += len(data)
        req = urllib.request.Request(f'{U}/storage/v1/object/item-images/{urllib.parse.quote(p)}.w{w}.jpg', data=data, method='POST',
            headers={**H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true', 'cache-control': 'max-age=31536000'})
        urllib.request.urlopen(req).read()
    done += 1
print('done', done, f'avg KB full={bytes_full/done/1024:.0f} w800={bytes_800/done/1024:.0f} w400={bytes_400/done/1024:.0f}')
