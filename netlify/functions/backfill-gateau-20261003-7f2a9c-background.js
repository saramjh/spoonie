const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const IG = 'https://graph.instagram.com/v21.0';

const ITEM_ID = '1e63356e-e201-4ba9-bf47-fa4501e267f7';
const ORIGINAL_RELEASED_AT = '2026-10-03T02:30:35.333Z';
const ORIGINAL_CREATED_AT = '2026-10-03T02:30:35.333Z';
const ORIGINAL_UPDATED_AT = '2026-10-03T02:30:35.480301Z';

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

async function restoreTimestamps() {
  await call('PATCH', `release_queue?item_id=eq.${ITEM_ID}`, { released_at: ORIGINAL_RELEASED_AT });
  await call('PATCH', `items?id=eq.${ITEM_ID}`, { created_at: ORIGINAL_CREATED_AT, updated_at: ORIGINAL_UPDATED_AT });
}

function caption(item, ingredients) {
  const names = ingredients.map((i) => i.name).slice(0, 6);
  const tags = ['집밥', '레시피', 'Spoonie', ...(item.tags || [])].map((t) => '#' + String(t).replace(/\s+/g, '')).filter((t, i, all) => all.indexOf(t) === i).slice(0, 10);
  const meta = [item.servings ? `${item.servings}인분` : '', item.cooking_time_minutes ? `${item.cooking_time_minutes}분` : ''].filter(Boolean).join(' · ');
  return [item.title, '', item.description || '', '', names.length ? `재료: ${names.join(', ')}${ingredients.length > names.length ? ' 외' : ''}` : '', meta, '', '분량과 순서, 단계별 사진은 Spoonie에서 볼 수 있어요. 프로필 링크 → spoonie.kr', '', tags.join(' ')].filter((line, i, all) => !(line === '' && all[i - 1] === '')).join('\n').trim();
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

exports.handler = async () => {
  try {
    const [queue] = await call('GET', `release_queue?select=instagram_media_id&item_id=eq.${ITEM_ID}`);
    if (queue?.instagram_media_id) {
      await restoreTimestamps();
      return { statusCode: 200, body: 'already backfilled' };
    }
    const [saved] = await call('GET', 'instagram_credentials?select=access_token&id=eq.1');
    const token = saved?.access_token || process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!token) throw new Error('instagram token unavailable');

    const [item] = await call('GET', `items?select=title,description,tags,servings,cooking_time_minutes,image_urls,thumbnail_index&id=eq.${ITEM_ID}`);
    const ingredients = await call('GET', `ingredients?select=name&item_id=eq.${ITEM_ID}&order=order_index`);
    const steps = await call('GET', `instructions?select=image_url&item_id=eq.${ITEM_ID}&image_url=not.is.null&order=step_number`);
    const covers = item.image_urls || [];
    const first = covers[item.thumbnail_index || 0];
    const photos = [first, ...covers.filter((u) => u !== first), ...steps.map((s) => s.image_url)].filter(Boolean).slice(0, 10);
    if (!photos.length) throw new Error('no photos');

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

    await call('PATCH', `release_queue?item_id=eq.${ITEM_ID}`, { instagram_media_id: published.id, instagram_error: null, released_at: ORIGINAL_RELEASED_AT });
    await call('PATCH', `items?id=eq.${ITEM_ID}`, { created_at: ORIGINAL_CREATED_AT, updated_at: ORIGINAL_UPDATED_AT });
    return { statusCode: 200, body: 'backfilled' };
  } catch (error) {
    try {
      await call('PATCH', `release_queue?item_id=eq.${ITEM_ID}`, { instagram_error: String(error).slice(0, 500), released_at: ORIGINAL_RELEASED_AT });
      await call('PATCH', `items?id=eq.${ITEM_ID}`, { created_at: ORIGINAL_CREATED_AT, updated_at: ORIGINAL_UPDATED_AT });
    } catch {}
    return { statusCode: 500, body: 'backfill failed' };
  }
};
