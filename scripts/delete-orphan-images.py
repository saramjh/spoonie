# 어떤 글에서도 쓰지 않는 item-images 파일을 지운다 (2026-10-01 실행).
# 남기는 것: 글(비공개 포함)의 대표·단계 사진과 그 크기별 버전(.w400.jpg/.w800.jpg), 최근 24시간 안에 올라온 파일.
# 사용: python3 scripts/delete-orphan-images.py [--apply]   (--apply 없으면 목록만 출력)
import json, sys, urllib.request, urllib.parse, datetime
env = dict(l.strip().split('=', 1) for l in open('.env.local') if '=' in l and not l.startswith('#'))
U = env['NEXT_PUBLIC_SUPABASE_URL']; S = env['SUPABASE_SECRET_KEY']
H = {'apikey': S, 'Authorization': f'Bearer {S}', 'Content-Type': 'application/json'}
def req(method, path, body=None):
    r = urllib.request.Request(U + path, data=json.dumps(body).encode() if body is not None else None, method=method, headers=H)
    return json.load(urllib.request.urlopen(r))
PREFIX = U + '/storage/v1/object/public/item-images/'
used = set()
for it in req('GET', '/rest/v1/items?select=image_urls'):
    for u in it['image_urls'] or []: used.add(u)
for st in req('GET', '/rest/v1/instructions?select=image_url&image_url=not.is.null'): used.add(st['image_url'])
keep = set()
for u in used:
    if u and u.startswith(PREFIX):
        p = urllib.parse.unquote(u[len(PREFIX):].split('?')[0]); keep |= {p, p + '.w400.jpg', p + '.w800.jpg'}
# 사용자 폴더별로 파일 목록
objects = []
for folder in req('POST', '/storage/v1/object/list/item-images', {'prefix': '', 'limit': 1000}):
    name = folder['name']
    if folder.get('id'): objects.append(folder); continue
    for o in req('POST', '/storage/v1/object/list/item-images', {'prefix': name + '/', 'limit': 1000}):
        o['name'] = f"{name}/{o['name']}"; objects.append(o)
cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=24)
orphans = [o for o in objects if o['name'] not in keep and datetime.datetime.fromisoformat(o['created_at'].replace('Z', '+00:00')) < cutoff]
size = sum((o.get('metadata') or {}).get('size', 0) for o in orphans)
if not keep or len(orphans) > len(objects) / 2:
    sys.exit(f'중단: 쓰는 사진 {len(keep)}개, 지울 파일 {len(orphans)}/{len(objects)} (안전장치)')
print(f'files {len(objects)}, keep {len([o for o in objects if o["name"] in keep])}, orphans {len(orphans)} ({size/1024/1024:.1f}MB)')
if '--apply' in sys.argv and orphans:
    names = [o['name'] for o in orphans]
    for i in range(0, len(names), 100):
        req('DELETE', '/storage/v1/object/item-images', {'prefixes': names[i:i+100]})
    print('deleted', len(names))
