/**
 * 쓰지 않는 사진 파일 정리 (매주 실행, netlify.toml의 schedule)
 *
 * 글을 고치거나 지울 때 브라우저가 바로 지우지만(src/lib/item-images.ts), 그 요청이 빠진 경우를 위한 안전망이다.
 * 사용자 UUID 폴더만 정리한다. 글(비공개 포함)의 대표·단계 사진과 크기별 버전(.w400.jpg/.w800.jpg), 최근 24시간 안에 올라온 파일은 남긴다.
 * 안전장치: 조회가 실패하거나, 쓰는 사진이 하나도 없거나, 전체의 절반 넘게 지우게 되면 아무것도 지우지 않는다.
 *
 * 필요한 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const BUCKET = 'item-images';
const GRACE_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;
const USER_FOLDER = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const headers = { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}`, 'Content-Type': 'application/json' };

async function call(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${path.split('?')[0]} ${res.status}`);
  return res.json();
}

async function listStoragePrefix(prefix) {
  const objects = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await call('POST', `/storage/v1/object/list/${BUCKET}`, {
      prefix,
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    objects.push(...page);
    if (page.length < PAGE_SIZE) return objects;
  }
}

async function listRestRows(path) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const separator = path.includes('?') ? '&' : '?';
    const page = await call('GET', `${path}${separator}limit=${PAGE_SIZE}&offset=${offset}`);
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function listAll() {
  const objects = [];
  const top = await listStoragePrefix('');
  for (const entry of top) {
    if (entry.id || !USER_FOLDER.test(entry.name)) continue;

    const inner = await listStoragePrefix(`${entry.name}/`);
    for (const object of inner) {
      if (!object.id || !object.created_at) continue;
      objects.push({ ...object, name: `${entry.name}/${object.name}` });
    }
  }
  return objects;
}

async function loadReferencedPaths() {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  const [items, steps] = await Promise.all([
    listRestRows('/rest/v1/items?select=image_urls&order=id.asc'),
    listRestRows('/rest/v1/instructions?select=image_url&image_url=not.is.null&order=id.asc'),
  ]);
  const keep = new Set();
  for (const url of [...items.flatMap((i) => i.image_urls || []), ...steps.map((s) => s.image_url)]) {
    if (!url || !url.startsWith(prefix)) continue;
    const path = decodeURIComponent(url.slice(prefix.length).split('?')[0]);
    keep.add(path).add(`${path}.w400.jpg`).add(`${path}.w800.jpg`);
  }
  return keep;
}

exports.handler = async () => {
  try {
    const keep = await loadReferencedPaths();
    if (keep.size === 0) return { statusCode: 200, body: 'skip: no referenced images found' };

    const objects = await listAll();
    const cutoff = Date.now() - GRACE_MS;
    const candidates = objects.filter((o) => o.created_at && !keep.has(o.name) && new Date(o.created_at).getTime() < cutoff).map((o) => o.name);
    if (candidates.length === 0) return { statusCode: 200, body: 'deleted 0' };

    const latestKeep = await loadReferencedPaths();
    if (latestKeep.size === 0) return { statusCode: 200, body: 'skip: no referenced images found on recheck' };
    const orphans = candidates.filter((name) => !latestKeep.has(name));

    if (orphans.length > objects.length / 2) {
      console.error(`sweep aborted: ${orphans.length}/${objects.length} would be deleted`);
      return { statusCode: 200, body: 'skip: too many deletions' };
    }
    for (let i = 0; i < orphans.length; i += 100) {
      await call('DELETE', `/storage/v1/object/${BUCKET}`, { prefixes: orphans.slice(i, i + 100) });
    }
    console.log(`sweep: files ${objects.length}, candidates ${candidates.length}, deleted ${orphans.length}`);
    return { statusCode: 200, body: `deleted ${orphans.length}` };
  } catch (error) {
    console.error('sweep failed', error);
    return { statusCode: 500, body: 'sweep failed' };
  }
};
