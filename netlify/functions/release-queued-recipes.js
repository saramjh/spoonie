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
 * - 예약 함수는 30초 안에 끝나야 한다: 사진은 한꺼번에 올리고, 만든 묶음 id를 남겨 시간 안에 못 올리면 다음 실행 때 마저 올린다.
 * - 실행마다 "공개됐지만 아직 안 올라간" 가장 오래된 하나를 올린다 (밀린 것이 있으면 그것부터).
 * - 재시도로 두 번 공개하지 않게, 마지막 공개 50분 안에는 새로 공개하지 않는다.
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

// 컨테이너가 준비됐는지 (FINISHED). 준비 중이면 false, 실패면 던진다
async function isReady(id, token) {
  const { status_code } = await ig('GET', `/${id}`, { fields: 'status_code', access_token: token });
  if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`instagram container ${status_code}`);
  return status_code === 'FINISHED';
}

async function waitUntilReady(ids, token, tries) {
  for (let i = 0; i < tries; i++) {
    const ready = await Promise.all(ids.map((id) => isReady(id, token)));
    if (ready.every(Boolean)) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

// 게시 묶음(컨테이너)을 만든다. 사진은 한꺼번에 올려 시간을 줄인다 (예약 함수는 30초 안에 끝나야 한다)
async function createContainer(itemId, token) {
  const [item] = await call('GET', `items?select=title,description,tags,servings,cooking_time_minutes,image_urls,thumbnail_index&id=eq.${itemId}`);
  const ingredients = await call('GET', `ingredients?select=name&item_id=eq.${itemId}&order=order_index`);
  const steps = await call('GET', `instructions?select=image_url&item_id=eq.${itemId}&image_url=not.is.null&order=step_number`);
  const covers = item.image_urls || [];
  const first = covers[item.thumbnail_index || 0];
  const photos = [first, ...covers.filter((u) => u !== first), ...steps.map((s) => s.image_url)].filter(Boolean).slice(0, 10);
  if (!photos.length) return null;
  const { user_id: igUserId } = await ig('GET', '/me', { fields: 'user_id', access_token: token });
  const text = caption(item, ingredients);
  if (photos.length === 1) return (await ig('POST', `/${igUserId}/media`, { image_url: photos[0], caption: text, access_token: token })).id;
  const children = await Promise.all(photos.map((url) => ig('POST', `/${igUserId}/media`, { image_url: url, is_carousel_item: 'true', access_token: token }).then((r) => r.id)));
  if (!(await waitUntilReady(children, token, 4))) return 'PENDING'; // 사진 처리가 늦으면 다음 실행 때 다시 만든다
  return (await ig('POST', `/${igUserId}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: text, access_token: token })).id;
}

// 준비된 컨테이너를 게시한다. 아직 준비 중이면 null (다음 실행 때 다시)
async function publishContainer(containerId, token) {
  if (!(await waitUntilReady([containerId], token, 3))) return null;
  const { user_id: igUserId } = await ig('GET', '/me', { fields: 'user_id', access_token: token });
  return (await ig('POST', `/${igUserId}/media_publish`, { creation_id: containerId, access_token: token })).id;
}

// 공개됐지만 인스타그램에 아직 안 올라간 레시피 하나를 올린다 (만들다 만 컨테이너가 있으면 그것부터)
async function postPendingToInstagram(token) {
  const [row] = await call('GET', 'release_queue?select=item_id,instagram_container_id&released_at=not.is.null&instagram_media_id=is.null&instagram_error=is.null&order=release_order.asc&limit=1');
  if (!row) return { skipped: 'nothing pending' };
  try {
    let containerId = row.instagram_container_id;
    if (!containerId) {
      containerId = await createContainer(row.item_id, token);
      if (!containerId) {
        await call('PATCH', `release_queue?item_id=eq.${row.item_id}`, { instagram_error: 'no photos' });
        return { skipped: 'no photos' };
      }
      if (containerId === 'PENDING') return { pending: row.item_id };
      await call('PATCH', `release_queue?item_id=eq.${row.item_id}`, { instagram_container_id: containerId });
    }
    const mediaId = await publishContainer(containerId, token);
    if (!mediaId) return { pending: row.item_id };
    await call('PATCH', `release_queue?item_id=eq.${row.item_id}`, { instagram_media_id: mediaId });
    return { mediaId, itemId: row.item_id };
  } catch (error) {
    console.error('instagram failed', error);
    await call('PATCH', `release_queue?item_id=eq.${row.item_id}`, { instagram_error: String(error).slice(0, 500) });
    return { error: String(error) };
  }
}

// 같은 예약이 재시도돼 두 번 공개하지 않게: 마지막 공개가 50분 안이면 이번 공개는 건너뛴다
const MIN_GAP_MS = 50 * 60 * 1000;

exports.handler = async () => {
  const startedAt = Date.now();
  try {
    const [last] = await call('GET', 'release_queue?select=released_at&released_at=not.is.null&order=released_at.desc&limit=1');
    const recentlyReleased = last && Date.now() - new Date(last.released_at).getTime() < MIN_GAP_MS;
    const [next] = recentlyReleased ? [] : await call('GET', 'release_queue?select=item_id&released_at=is.null&order=release_order.asc&limit=1');
    if (next) {
      const now = new Date().toISOString();
      const [item] = await call('PATCH', `items?id=eq.${next.item_id}`, { is_public: true, created_at: now, updated_at: now });
      await call('PATCH', `release_queue?item_id=eq.${next.item_id}`, { released_at: now });
      console.log('released', next.item_id, item && item.title);
    } else {
      console.log(recentlyReleased ? 'skip release: released less than 50 minutes ago' : 'queue empty');
    }

    // 인스타그램: 공개됐지만 아직 안 올라간 것 하나 (실패해도 공개는 되돌리지 않는다)
    // 밀린 것이 있으면 시간이 허락하는 만큼(최대 2개) 올린다
    const token = await instagramToken();
    const results = [];
    if (!token) results.push({ skipped: 'no token' });
    while (token && results.length < 2 && Date.now() - startedAt < 12000) {
      const result = await postPendingToInstagram(token);
      results.push(result);
      if (!result.mediaId) break;
    }
    console.log('instagram', JSON.stringify(results));
    return { statusCode: 200, body: JSON.stringify({ released: next ? next.item_id : null, instagram: results }) };
  } catch (error) {
    console.error('release failed', error);
    return { statusCode: 500, body: String(error) };
  }
};

// 로컬 점검용 (실행하지 않음)
exports._postPendingToInstagram = postPendingToInstagram;
exports._instagramToken = instagramToken;
