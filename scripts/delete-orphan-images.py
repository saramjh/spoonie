# 어떤 글에서도 쓰지 않는 item-images 파일을 지운다 (2026-10-01 실행).
# 남기는 것: 글(비공개 포함)의 대표·단계 사진과 그 크기별 버전(.w400.jpg/.w800.jpg), 최근 24시간 안에 올라온 파일.
# 사용: python3 scripts/delete-orphan-images.py [--apply]   (--apply 없으면 목록만 출력)
import json, re, sys, urllib.request, urllib.parse, datetime
env = dict(l.strip().split('=', 1) for l in open('.env.local') if '=' in l and not l.startswith('#'))
U = env['NEXT_PUBLIC_SUPABASE_URL']; S = env['SUPABASE_SECRET_KEY']
H = {'apikey': S, 'Authorization': f'Bearer {S}', 'Content-Type': 'application/json'}
PAGE_SIZE = 1000
USER_FOLDER = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', re.I)
def req(method, path, body=None):
    r = urllib.request.Request(U + path, data=json.dumps(body).encode() if body is not None else None, method=method, headers=H)
    return json.load(urllib.request.urlopen(r))
def pages(method, path, body=None):
    rows = []; offset = 0
    while True:
        if method == 'GET':
            sep = '&' if '?' in path else '?'
            page = req('GET', f'{path}{sep}limit={PAGE_SIZE}&offset={offset}')
        else:
            page = req(method, path, {**(body or {}), 'limit': PAGE_SIZE, 'offset': offset, 'sortBy': {'column': 'name', 'order': 'asc'}})
        rows.extend(page)
        if len(page) < PAGE_SIZE: return rows
        offset += PAGE_SIZE
PREFIX = U + '/storage/v1/object/public/item-images/'
def referenced_paths():
    used = set()
    for it in pages('GET', '/rest/v1/items?select=image_urls&order=id.asc'):
        for u in it['image_urls'] or []: used.add(u)
    for st in pages('GET', '/rest/v1/instructions?select=image_url&image_url=not.is.null&order=id.asc'): used.add(st['image_url'])
    keep = set()
    for u in used:
        if u and u.startswith(PREFIX):
            p = urllib.parse.unquote(u[len(PREFIX):].split('?')[0]); keep |= {p, p + '.w400.jpg', p + '.w800.jpg'}
    return keep

keep = referenced_paths()
# 사용자 UUID 폴더만 끝까지 읽는다. marketing 같은 운영 자산 prefix는 이 스크립트의 소유 범위가 아니다.
objects = []
for folder in pages('POST', '/storage/v1/object/list/item-images', {'prefix': ''}):
    name = folder['name']
    if folder.get('id') or not USER_FOLDER.match(name): continue
    for o in pages('POST', '/storage/v1/object/list/item-images', {'prefix': name + '/'}):
        if not o.get('id') or not o.get('created_at'): continue
        o['name'] = f"{name}/{o['name']}"; objects.append(o)
cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=24)
orphans = [o for o in objects if o.get('created_at') and o['name'] not in keep and datetime.datetime.fromisoformat(o['created_at'].replace('Z', '+00:00')) < cutoff]
size = sum((o.get('metadata') or {}).get('size', 0) for o in orphans)
if not keep or len(orphans) > len(objects) / 2:
    sys.exit(f'중단: 쓰는 사진 {len(keep)}개, 지울 파일 {len(orphans)}/{len(objects)} (안전장치)')
print(f'files {len(objects)}, keep {len([o for o in objects if o["name"] in keep])}, orphans {len(orphans)} ({size/1024/1024:.1f}MB)')
if '--apply' in sys.argv and orphans:
    latest_keep = referenced_paths()
    names = [o['name'] for o in orphans if o['name'] not in latest_keep]
    for i in range(0, len(names), 100):
        req('DELETE', '/storage/v1/object/item-images', {'prefixes': names[i:i+100]})
    print('deleted', len(names))
