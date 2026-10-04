# 촬영 원본 폴더의 사진으로 레시피를 비공개로 올린다 (프레마몽 촬영 자료 이전용).
# 사용: <pillow가 있는 python> scripts/import-photo-recipes.py <drafts.json> <사진목록폴더> <user_id> [--queue]
# 사진은 앱과 같은 규격(긴 변 1280px + .w800.jpg + .w400.jpg)으로 먼저 모두 올린 뒤,
# save_recipe_atomic RPC로 본체·재료·단계를 한 트랜잭션에서 저장한다.
import io, json, os, random, sys, time, urllib.parse, urllib.request
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = dict(l.strip().split('=', 1) for l in open(os.path.join(ROOT, '.env.local')) if '=' in l and not l.startswith('#'))
U = env['NEXT_PUBLIC_SUPABASE_URL']; S = env['SUPABASE_SECRET_KEY']
H = {'apikey': S, 'Authorization': f'Bearer {S}'}
BUCKET = 'item-images'

def rest(path, body, prefer='return=representation'):
    req = urllib.request.Request(U + '/rest/v1/' + path, data=json.dumps(body).encode(), method='POST',
        headers={**H, 'Content-Type': 'application/json', 'Prefer': prefer})
    raw = urllib.request.urlopen(req).read()
    return json.loads(raw) if raw else None

def get(path):
    return json.load(urllib.request.urlopen(urllib.request.Request(U + '/rest/v1/' + path, headers=H)))

def jpeg(im, w):
    im = im.copy(); im.thumbnail((w, w)); buf = io.BytesIO(); im.save(buf, 'JPEG', quality=82, optimize=True, progressive=True); return buf.getvalue()

def put(name, data):
    req = urllib.request.Request(f'{U}/storage/v1/object/{BUCKET}/{name}', data=data, method='POST',
        headers={**H, 'Content-Type': 'image/jpeg', 'cache-control': 'max-age=31536000'})
    urllib.request.urlopen(req).read()

def delete_objects(names):
    if not names: return
    req = urllib.request.Request(f'{U}/storage/v1/object/{BUCKET}', data=json.dumps({'prefixes': names}).encode(), method='DELETE',
        headers={**H, 'Content-Type': 'application/json'})
    urllib.request.urlopen(req).read()

def upload(path, uid, created_paths):
    im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    name = f'{uid}/{int(time.time() * 1000)}-{random.getrandbits(32):08x}.jpg'
    put(name, jpeg(im, 1280)); created_paths.append(name)
    for w in (800, 400):
        variant = f'{name}.w{w}.jpg'
        put(variant, jpeg(im, w)); created_paths.append(variant)
    return f'{U}/storage/v1/object/public/{BUCKET}/{name}'

def normalize_tags(values):
    out = []
    for value in values or []:
        tag = ' '.join(str(value).strip().lstrip('#').split())
        if tag and tag.casefold() not in {x.casefold() for x in out}: out.append(tag)
    return out

drafts_path, sheets_dir, uid = sys.argv[1:4]
queue = '--queue' in sys.argv[4:]
last = get('release_queue?select=release_order&order=release_order.desc&limit=1') if queue else []
next_order = (last[0]['release_order'] + 1) if last else 1
created = []

for d in json.load(open(drafts_path)):
    created_paths = []
    try:
        photos = dict(l.rstrip('\n').split('\t', 1) for l in open(os.path.join(sheets_dir, d['sheet'] + '.jpg.txt')))
        q = urllib.parse.quote
        found = get(f"items?select=id&user_id=eq.{uid}&title=eq.{q(d['title'])}&item_type=eq.recipe")
        existing_id = found[0]['id'] if found else None

        cover = [upload(photos[str(i)], uid, created_paths) for i in d['cover']]
        instructions = [
            {'step_number': i + 1, 'description': text, 'image_url': upload(photos[str(photo)], uid, created_paths) if photo is not None else None}
            for i, (photo, text) in enumerate(d['steps'])
        ]
        item_payload = {
            'user_id': uid,
            'title': d['title'],
            'description': d.get('description') or '',
            'image_urls': cover,
            'thumbnail_index': 0,
            'tags': normalize_tags(d.get('tags')),
            'is_public': False,
            'servings': d['servings'],
            'cooking_time_minutes': d['cooking_time_minutes'],
            'cited_recipe_ids': [],
            'creation_origin': 'manual',
        }
        ingredients = [
            {'name': name, 'amount': amount, 'unit': unit, 'order_index': i + 1}
            for i, (name, amount, unit) in enumerate(d['ingredients'])
        ]
        item_id = rest('rpc/save_recipe_atomic', {
            'p_existing_id': existing_id,
            'p_item': item_payload,
            'p_ingredients': ingredients,
            'p_instructions': instructions,
        })
        if not item_id: raise RuntimeError('save_recipe_atomic returned no item id')

        if queue and not get(f"release_queue?select=item_id&item_id=eq.{item_id}"):
            rest('release_queue', {'item_id': item_id, 'release_order': next_order}, 'return=minimal')
            next_order += 1
        created.append({'id': item_id, 'title': d['title']})
        print('created' if not existing_id else 'updated', item_id, d['title'])
    except Exception:
        # DB transaction 실패 전 올린 새 사진은 참조되지 않으므로 즉시 정리한다.
        try: delete_objects(created_paths)
        except Exception as cleanup_error: print('cleanup failed', cleanup_error, file=sys.stderr)
        raise

json.dump(created, open(drafts_path + '.created.json', 'w'), ensure_ascii=False, indent=1)
