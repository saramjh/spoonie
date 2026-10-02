# 촬영 원본 폴더의 사진으로 레시피를 비공개로 올린다 (프레마몽 촬영 자료 이전용).
# 사용: <pillow가 있는 python> scripts/import-photo-recipes.py <drafts.json> <사진목록폴더> <user_id>
#   drafts.json: [{sheet, cover:[번호…], title, description, servings, cooking_time_minutes, tags, ingredients:[[이름,양,단위]…], steps:[[번호,설명]…]}]
#   사진목록폴더/<sheet>.jpg.txt: "번호\t원본경로" 줄 (콘택트 시트를 만들 때 나온 목록)
# 사진은 앱과 같은 규격(긴 변 1280px + .w800.jpg + .w400.jpg)으로 올린다. 글은 is_public=false로 만든다.
# 만든 글 id는 <drafts.json>.created.json에 남긴다 (되돌릴 때 쓴다).
import io, json, os, random, sys, time, urllib.parse, urllib.request
from PIL import Image, ImageOps

env = dict(l.strip().split('=', 1) for l in open('/Users/ojihun/DEV/spoonie/.env.local') if '=' in l and not l.startswith('#'))
U = env['NEXT_PUBLIC_SUPABASE_URL']; S = env['SUPABASE_SECRET_KEY']
H = {'apikey': S, 'Authorization': f'Bearer {S}'}
BUCKET = 'item-images'

def rest(path, body, prefer='return=representation'):
    req = urllib.request.Request(U + '/rest/v1/' + path, data=json.dumps(body).encode(), method='POST',
        headers={**H, 'Content-Type': 'application/json', 'Prefer': prefer})
    body = urllib.request.urlopen(req).read()
    return json.loads(body) if body else None

def get(path):
    return json.load(urllib.request.urlopen(urllib.request.Request(U + '/rest/v1/' + path, headers=H)))

def jpeg(im, w):
    im = im.copy(); im.thumbnail((w, w)); buf = io.BytesIO(); im.save(buf, 'JPEG', quality=82, optimize=True, progressive=True); return buf.getvalue()

def put(name, data):
    req = urllib.request.Request(f'{U}/storage/v1/object/{BUCKET}/{name}', data=data, method='POST',
        headers={**H, 'Content-Type': 'image/jpeg', 'cache-control': 'max-age=31536000'})
    urllib.request.urlopen(req).read()

def upload(path, uid):
    im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    name = f'{uid}/{int(time.time() * 1000)}-{random.getrandbits(32):08x}.jpg'
    put(name, jpeg(im, 1280))
    for w in (800, 400): put(f'{name}.w{w}.jpg', jpeg(im, w))
    return f'{U}/storage/v1/object/public/{BUCKET}/{name}'

drafts_path, sheets_dir, uid = sys.argv[1:4]
created = []
for d in json.load(open(drafts_path)):
    photos = dict(l.rstrip('\n').split('\t', 1) for l in open(os.path.join(sheets_dir, d['sheet'] + '.jpg.txt')))
    # 중간에 멈춘 실행을 이어 간다: 같은 사람의 같은 제목 글이 있으면 빠진 부분만 채운다
    q = urllib.parse.quote
    found = get(f"items?select=id,ingredients(count),instructions(count)&user_id=eq.{uid}&title=eq.{q(d['title'])}&item_type=eq.recipe")
    if found:
        item = found[0]
    else:
        cover = [upload(photos[str(i)], uid) for i in d['cover']]
        item = rest('items', {'user_id': uid, 'item_type': 'recipe', 'title': d['title'], 'description': d['description'], 'content': d['description'],
            'image_urls': cover, 'thumbnail_index': 0, 'tags': d['tags'], 'is_public': False,
            'servings': d['servings'], 'cooking_time_minutes': d['cooking_time_minutes'], 'creation_origin': 'manual'})[0]
    if not (found and item['ingredients'][0]['count']):
        rest('ingredients', [{'item_id': item['id'], 'name': n, 'amount': a, 'unit': u, 'order_index': i} for i, (n, a, u) in enumerate(d['ingredients'])], 'return=minimal')
    if not (found and item['instructions'][0]['count']):
        rest('instructions', [{'item_id': item['id'], 'step_number': i + 1, 'description': text, 'image_url': upload(photos[str(p)], uid)} for i, (p, text) in enumerate(d['steps'])], 'return=minimal')
    created.append({'id': item['id'], 'title': d['title']})
    print('created', item['id'], d['title'])
json.dump(created, open(drafts_path + '.created.json', 'w'), ensure_ascii=False, indent=1)
