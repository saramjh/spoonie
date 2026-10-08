/**
 * 나눠서 공개하기 (하루 세 번, netlify.toml의 schedule)
 *
 * release_queue(supabase/release_queue.sql)의 맨 앞 하나를 공개한다.
 * 공개하는 순간을 글의 작성 시각으로 삼는다: 비공개로 미리 올려 둔 날짜가 아니라 실제로 사람들에게 보인 때다
 * (그래야 피드 맨 위에 "방금 올라온 글"로 보인다). 과거 날짜로 꾸미지 않는다.
 * 대기열이 비었으면 아무것도 하지 않는다.
 *
 * 공개한 뒤 인스타그램(@spoonie.kitchen)에 같은 레시피의 사진(대표 + 단계, 최대 10장)과 캡션을 올린다 (운영자 승인, 2026-10-03).
 * - 인스타그램 실패는 레시피 공개를 되돌리지 않는다. 일시 오류는 release_queue의 재시도 상태에 남기고 최대 5회 재시도한다.
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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { compileInstagramContent } = require('./instagram-content');
const REFRESH_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const INSTAGRAM_MAX_ATTEMPTS = 5;
const INSTAGRAM_RETRY_DELAYS_MS = [15 * 60 * 1000, 60 * 60 * 1000, 6 * 60 * 60 * 1000, 24 * 60 * 60 * 1000];
const INSTAGRAM_PERMANENT_CODES = new Set([10, 190, 200]);
const INSTAGRAM_MIN_POST_GAP_MS = 3 * 60 * 60 * 1000;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr';
const headers = { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

async function call(method, path, body, extraHeaders) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers: { ...headers, ...extraHeaders }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${path.split('?')[0]} ${res.status} ${await res.text()}`);
  return res.json();
}

async function revalidatePublished(itemId) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret) return { skipped: 'no revalidation secret' };
  const res = await fetch(`${APP_URL}/api/revalidate-published`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`revalidate published ${res.status} ${await res.text()}`);
  return res.json();
}

class InstagramApiError extends Error {
  constructor(path, message, details = {}) {
    super(`instagram ${path} ${message}`);
    this.name = 'InstagramApiError';
    this.path = path;
    this.status = details.status ?? null;
    this.code = details.code ?? null;
    this.subcode = details.subcode ?? null;
    this.isTransient = details.isTransient ?? null;
    this.transport = details.transport === true;
  }
}

async function ig(method, path, params) {
  const url = new URL(IG + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  let res;
  try {
    res = await fetch(url, { method });
  } catch (error) {
    throw new InstagramApiError(path, error instanceof Error ? error.message : String(error), { transport: true });
  }

  let json = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  if (!res.ok || json.error) {
    const meta = json.error || {};
    throw new InstagramApiError(path, meta.message || String(res.status), {
      status: res.status,
      code: meta.code,
      subcode: meta.error_subcode,
      isTransient: meta.is_transient,
    });
  }
  return json;
}

function serializeInstagramError(error) {
  const parts = [error instanceof Error ? error.message : String(error)];
  if (error && typeof error === 'object') {
    if (error.status != null) parts.push(`status=${error.status}`);
    if (error.code != null) parts.push(`code=${error.code}`);
    if (error.subcode != null) parts.push(`subcode=${error.subcode}`);
    if (error.isTransient != null) parts.push(`transient=${error.isTransient}`);
    if (error.transport) parts.push('transport=true');
  }
  return parts.join(' ').slice(0, 500);
}

function instagramFailurePlan(error, attemptCount, nowMs = Date.now()) {
  const ambiguousPublish = error && error.transport === true && String(error.path || '').endsWith('/media_publish');
  const permanentApiError = error && INSTAGRAM_PERMANENT_CODES.has(Number(error.code));
  const terminal = ambiguousPublish || permanentApiError || attemptCount >= INSTAGRAM_MAX_ATTEMPTS;
  if (terminal) return { terminal: true, nextRetryAt: null };
  const delay = INSTAGRAM_RETRY_DELAYS_MS[Math.min(Math.max(attemptCount - 1, 0), INSTAGRAM_RETRY_DELAYS_MS.length - 1)];
  return { terminal: false, nextRetryAt: new Date(nowMs + delay).toISOString() };
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
async function createContainer(itemId, token, releaseOrder) {
  const [item] = await call('GET', `items?select=title,description,tags,servings,cooking_time_minutes,image_urls,thumbnail_index&id=eq.${itemId}`);
  const ingredients = await call('GET', `ingredients?select=name&item_id=eq.${itemId}&order=order_index`);
  const steps = await call('GET', `instructions?select=image_url&item_id=eq.${itemId}&image_url=not.is.null&order=step_number`);
  const content = compileInstagramContent(item, ingredients, steps, releaseOrder);
  if (!content.photos.length) return null;
  const { user_id: igUserId } = await ig('GET', '/me', { fields: 'user_id', access_token: token });
  if (content.photos.length === 1) {
    const id = (await ig('POST', `/${igUserId}/media`, {
      image_url: content.photos[0],
      caption: content.caption,
      access_token: token,
    })).id;
    return { id, experiment: content.experiment };
  }
  const children = await Promise.all(content.photos.map((url) => ig('POST', `/${igUserId}/media`, { image_url: url, is_carousel_item: 'true', access_token: token }).then((r) => r.id)));
  if (!(await waitUntilReady(children, token, 4))) return 'PENDING'; // 사진 처리가 늦으면 다음 실행 때 다시 만든다
  const id = (await ig('POST', `/${igUserId}/media`, {
    media_type: 'CAROUSEL',
    children: children.join(','),
    caption: content.caption,
    access_token: token,
  })).id;
  return { id, experiment: content.experiment };
}

// 준비된 컨테이너를 게시한다. 아직 준비 중이면 null (다음 실행 때 다시)
async function publishContainer(containerId, token) {
  if (!(await waitUntilReady([containerId], token, 3))) return null;
  const { user_id: igUserId } = await ig('GET', '/me', { fields: 'user_id', access_token: token });
  return (await ig('POST', `/${igUserId}/media_publish`, { creation_id: containerId, access_token: token })).id;
}

function instagramPostGap(lastPublishedAt, now = new Date()) {
  if (!lastPublishedAt) return { blocked: false, nextEligibleAt: null };
  const lastMs = new Date(lastPublishedAt).getTime();
  if (!Number.isFinite(lastMs)) return { blocked: false, nextEligibleAt: null };
  const nextMs = lastMs + INSTAGRAM_MIN_POST_GAP_MS;
  return {
    blocked: now.getTime() < nextMs,
    nextEligibleAt: new Date(nextMs).toISOString(),
  };
}

function instagramPendingPath(now = new Date()) {
  const due = encodeURIComponent(now.toISOString());
  return `release_queue?select=item_id,release_order,instagram_container_id,instagram_attempt_count,instagram_experiment_version,instagram_cta_variant,instagram_hook_variant,instagram_slide_strategy,instagram_content_format,instagram_slide_count` +
    '&released_at=not.is.null' +
    '&instagram_media_id=is.null' +
    '&instagram_terminal_error=eq.false' +
    `&or=(instagram_next_retry_at.is.null,instagram_next_retry_at.lte.${due})` +
    '&order=release_order.asc&limit=1';
}

// Use both this recipe release queue and *all* recent Instagram Feed/Reel posts.
// PRM campaigns and Reels are published outside release_queue; ignoring those
// can violate the 3-hour policy and make simultaneous growth lanes collide.
function newestInstagramPostAt(releaseAt, liveMedia) {
  const times = [releaseAt, ...(liveMedia || []).map(item => item.timestamp)]
    .map(value => Date.parse(value || ''))
    .filter(Number.isFinite);
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}

// 공개됐지만 인스타그램에 아직 안 올라간 레시피 하나를 올린다 (만들다 만 컨테이너가 있으면 그것부터)
async function postPendingToInstagram(token) {
  const now = new Date();
  const [lastPublished] = await call(
    'GET',
    'release_queue?select=instagram_published_at&instagram_published_at=not.is.null&order=instagram_published_at.desc&limit=1'
  );
  // Live Graph reads are fail-closed: a transport/API error cannot authorize
  // another post when a different PRM lane may have published minutes ago.
  const liveMedia = await ig('GET', '/me/media', {
    fields: 'id,timestamp,media_type', limit: '10', access_token: token,
  });
  const latestAt = newestInstagramPostAt(lastPublished?.instagram_published_at, liveMedia.data);
  const gap = instagramPostGap(latestAt, now);
  if (gap.blocked) return { skipped: 'post gap', nextEligibleAt: gap.nextEligibleAt };

  const [row] = await call('GET', instagramPendingPath(now));
  if (!row) return { skipped: 'nothing pending' };

  const attemptCount = Number(row.instagram_attempt_count || 0) + 1;
  await call('PATCH', `release_queue?item_id=eq.${row.item_id}`, {
    instagram_attempt_count: attemptCount,
    instagram_last_attempt_at: now.toISOString(),
    instagram_next_retry_at: null,
  });

  try {
    let containerId = row.instagram_container_id;
    if (!containerId) {
      const created = await createContainer(row.item_id, token, row.release_order);
      if (!created) {
        await call('PATCH', `release_queue?item_id=eq.${row.item_id}`, {
          instagram_error: 'no photos',
          instagram_terminal_error: true,
          instagram_next_retry_at: null,
        });
        return { skipped: 'no photos', terminal: true, itemId: row.item_id };
      }
      if (created === 'PENDING') return { pending: row.item_id };
      containerId = created.id;
      await call('PATCH', `release_queue?item_id=eq.${row.item_id}`, {
        instagram_container_id: containerId,
        instagram_experiment_version: created.experiment.version,
        instagram_cta_variant: created.experiment.ctaVariant,
        instagram_hook_variant: created.experiment.hookVariant,
        instagram_slide_strategy: created.experiment.slideStrategy,
        instagram_content_format: created.experiment.contentFormat,
        instagram_slide_count: created.experiment.slideCount,
      });
    }
    const mediaId = await publishContainer(containerId, token);
    if (!mediaId) return { pending: row.item_id };
    await call('PATCH', `release_queue?item_id=eq.${row.item_id}`, {
      instagram_media_id: mediaId,
      instagram_published_at: new Date().toISOString(),
      instagram_error: null,
      instagram_terminal_error: false,
      instagram_next_retry_at: null,
    });
    return { mediaId, itemId: row.item_id, attemptCount };
  } catch (error) {
    console.error('instagram failed', error);
    const plan = instagramFailurePlan(error, attemptCount);
    const message = serializeInstagramError(error);
    await call('PATCH', `release_queue?item_id=eq.${row.item_id}`, {
      instagram_error: message,
      instagram_terminal_error: plan.terminal,
      instagram_next_retry_at: plan.nextRetryAt,
    });
    return {
      error: message,
      itemId: row.item_id,
      attemptCount,
      terminal: plan.terminal,
      nextRetryAt: plan.nextRetryAt,
    };
  }
}

// 같은 예약이 재시도돼 두 번 공개하지 않게: 마지막 공개가 50분 안이면 이번 공개는 건너뛴다
async function drainInstagramQueue(startedAt = Date.now(), maxItems = 2) {
  const token = await instagramToken();
  if (!token) return [{ skipped: 'no token' }];

  const results = [];
  while (results.length < maxItems && Date.now() - startedAt < 12000) {
    const result = await postPendingToInstagram(token);
    results.push(result);
    if (!result.mediaId) break;
  }
  return results;
}

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
      try {
        console.log('revalidated', JSON.stringify(await revalidatePublished(next.item_id)));
      } catch (error) {
        console.error('release revalidation failed', error);
      }
    } else {
      console.log(recentlyReleased ? 'skip release: released less than 50 minutes ago' : 'queue empty');
    }

    // 인스타그램: 공개됐지만 아직 안 올라간 것 하나 (실패해도 공개는 되돌리지 않는다)
    // 한 번에 하나만 올려 backlog가 연속 게시되지 않게 한다.
    const results = await drainInstagramQueue(startedAt, 1);
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
exports._drainInstagramQueue = drainInstagramQueue;
exports._instagramFailurePlan = instagramFailurePlan;
exports._serializeInstagramError = serializeInstagramError;
exports._InstagramApiError = InstagramApiError;
exports._instagramPendingPath = instagramPendingPath;
exports._instagramPostGap = instagramPostGap;
exports._newestInstagramPostAt = newestInstagramPostAt;
exports._call = call;
exports._ig = ig;
