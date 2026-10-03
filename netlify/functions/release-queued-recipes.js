/**
 * 나눠서 공개하기 (하루 두 번, netlify.toml의 schedule)
 *
 * release_queue(supabase/release_queue.sql)의 맨 앞 하나를 공개한다.
 * 공개하는 순간을 글의 작성 시각으로 삼는다: 비공개로 미리 올려 둔 날짜가 아니라 실제로 사람들에게 보인 때다
 * (그래야 피드 맨 위에 "방금 올라온 글"로 보인다). 과거 날짜로 꾸미지 않는다.
 * 대기열이 비었으면 아무것도 하지 않는다.
 *
 * 공개한 뒤 인스타그램(@spoonie.kitchen)에 같은 레시피의 사진(대표 + 단계, 최대 10장)과 캡션을 올린다 (운영자 승인, 2026-10-03).
 * - 토큰이 없으면 건너뛴다. 인스타그램이 실패해도 레시피 공개는 그대로 두고, 오류만 release_queue.instagram_error에 남긴다.
 * - 장기 토큰은 60일 만료라 30일이 지나면 갱신해 instagram_credentials 표에 저장한다.
 *
 * 필요한 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 * 인스타그램(선택): INSTAGRAM_ACCESS_TOKEN (처음 한 번. 이후 갱신본은 DB에 있다)
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const IG = 'https://graph.instagram.com/v21.0';
const REFRESH_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const headers = { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

async function call(method, path, body, extraHeaders) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers: { ...headers, ...extraHeaders }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${path.split('?')[0]} ${res.status} ${await res.text()}`);
  return res.json();
}

async function ig(method, path, params) {
  const url = new URL(IG + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { method });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`instagram ${path} ${json.error ? json.error.message : res.status}`);
  return json;
}

// 쓸 토큰: DB에 갱신본이 있으면 그것, 없으면 환경 변수. 30일이 지났으면 갱신해 DB에 저장한다
async function instagramToken() {
  const [saved] = await call('GET', 'instagram_credentials?select=access_token,refreshed_at&id=eq.1');
  const token = saved ? saved.access_token : process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return null;
  const age = saved ? Date.now() - new Date(saved.refreshed_at).getTime() : Infinity;
  if (age < REFRESH_AFTER_MS) return token;
  try {
    const refreshed = await ig('GET', '/refresh_access_token', { grant_type: 'ig_refresh_token', access_token: token });
    await call('POST', 'instagram_credentials', { id: 1, access_token: refreshed.access_token, refreshed_at: new Date().toISOString() }, { Prefer: 'resolution=merge-duplicates,return=representation' });
    return refreshed.access_token;
  } catch (error) {
    console.error('instagram token refresh failed', error);
    return token; // 갱신에 실패해도 아직 만료 전이면 쓸 수 있다
  }
}

function caption(item, ingredients) {
  const names = ingredients.map((i) => i.name).slice(0, 6);
  const tags = ['집밥', '레시피', 'Spoonie', ...(item.tags || [])].map((t) => '#' + String(t).replace(/\s+/g, '')).filter((t, i, all) => all.indexOf(t) === i).slice(0, 10);
  const meta = [item.servings ? `${item.servings}인분` : '', item.cooking_time_minutes ? `${item.cooking_time_minutes}분` : ''].filter(Boolean).join(' · ');
  return [
    item.title,
    '',
    item.description || '',
    '',
    names.length ? `재료: ${names.join(', ')}${ingredients.length > names.length ? ' 외' : ''}` : '',
    meta,
    '',
    '분량과 순서, 단계별 사진은 Spoonie에서 볼 수 있어요. 프로필 링크 → spoonie.kr',
    '',
    tags.join(' '),
  ].filter((line, i, all) => !(line === '' && all[i - 1] === '')).join('\n').trim();
}

async function waitUntilReady(id, token) {
  for (let i = 0; i < 10; i++) {
    const { status_code } = await ig('GET', `/${id}`, { fields: 'status_code', access_token: token });
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`instagram container ${status_code}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('instagram container not ready');
}

async function postToInstagram(itemId) {
  const token = await instagramToken();
  if (!token) return { skipped: 'no token' };
  const [item] = await call('GET', `items?select=title,description,tags,servings,cooking_time_minutes,image_urls,thumbnail_index&id=eq.${itemId}`);
  const ingredients = await call('GET', `ingredients?select=name&item_id=eq.${itemId}&order=order_index`);
  const steps = await call('GET', `instructions?select=image_url&item_id=eq.${itemId}&image_url=not.is.null&order=step_number`);
  const covers = item.image_urls || [];
  const first = covers[item.thumbnail_index || 0];
  const photos = [first, ...covers.filter((u) => u !== first), ...steps.map((s) => s.image_url)].filter(Boolean).slice(0, 10);
  if (!photos.length) return { skipped: 'no photos' };
  const { user_id: igUserId } = await ig('GET', '/me', { fields: 'user_id', access_token: token });
  const text = caption(item, ingredients);
  let creationId;
  if (photos.length === 1) {
    creationId = (await ig('POST', `/${igUserId}/media`, { image_url: photos[0], caption: text, access_token: token })).id;
  } else {
    const children = [];
    for (const url of photos) children.push((await ig('POST', `/${igUserId}/media`, { image_url: url, is_carousel_item: 'true', access_token: token })).id);
    for (const id of children) await waitUntilReady(id, token);
    creationId = (await ig('POST', `/${igUserId}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: text, access_token: token })).id;
  }
  await waitUntilReady(creationId, token);
  const published = await ig('POST', `/${igUserId}/media_publish`, { creation_id: creationId, access_token: token });
  return { mediaId: published.id };
}

exports.handler = async () => {
  try {
    const [next] = await call('GET', 'release_queue?select=item_id&released_at=is.null&order=release_order.asc&limit=1');
    if (!next) return { statusCode: 200, body: 'queue empty' };
    const now = new Date().toISOString();
    const [item] = await call('PATCH', `items?id=eq.${next.item_id}`, { is_public: true, created_at: now, updated_at: now });
    await call('PATCH', `release_queue?item_id=eq.${next.item_id}`, { released_at: now });
    console.log('released', next.item_id, item && item.title);

    // 인스타그램: 실패해도 공개는 되돌리지 않는다
    try {
      const result = await postToInstagram(next.item_id);
      if (result.mediaId) await call('PATCH', `release_queue?item_id=eq.${next.item_id}`, { instagram_media_id: result.mediaId, instagram_error: null });
      console.log('instagram', JSON.stringify(result));
    } catch (error) {
      console.error('instagram failed', error);
      await call('PATCH', `release_queue?item_id=eq.${next.item_id}`, { instagram_error: String(error).slice(0, 500) });
    }
    return { statusCode: 200, body: `released ${next.item_id}` };
  } catch (error) {
    console.error('release failed', error);
    return { statusCode: 500, body: String(error) };
  }
};
