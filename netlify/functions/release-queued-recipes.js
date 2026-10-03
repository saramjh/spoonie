/**
 * 나눠서 공개하기 (하루 두 번, netlify.toml의 schedule)
 *
 * release_queue(supabase/release_queue.sql)의 맨 앞 하나를 공개한다.
 * 공개하는 순간을 글의 작성 시각으로 삼는다: 비공개로 미리 올려 둔 날짜가 아니라 실제로 사람들에게 보인 때다
 * (그래야 피드 맨 위에 "방금 올라온 글"로 보인다). 과거 날짜로 꾸미지 않는다.
 * 대기열이 비었으면 아무것도 하지 않는다.
 *
 * 필요한 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const headers = { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

async function call(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${path.split('?')[0]} ${res.status} ${await res.text()}`);
  return res.json();
}

exports.handler = async () => {
  try {
    const [next] = await call('GET', 'release_queue?select=item_id&released_at=is.null&order=release_order.asc&limit=1');
    if (!next) return { statusCode: 200, body: 'queue empty' };
    const now = new Date().toISOString();
    const [item] = await call('PATCH', `items?id=eq.${next.item_id}`, { is_public: true, created_at: now, updated_at: now });
    await call('PATCH', `release_queue?item_id=eq.${next.item_id}`, { released_at: now });
    console.log('released', next.item_id, item && item.title);
    return { statusCode: 200, body: `released ${next.item_id}` };
  } catch (error) {
    console.error('release failed', error);
    return { statusCode: 500, body: String(error) };
  }
};
