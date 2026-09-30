/**
 * 웹 푸시 발송 함수 (Netlify Functions + Web Push API)
 *
 * 보안 원칙
 * - 로그인한 사용자만 호출할 수 있다 (Supabase access token 검증).
 * - 알림 제목과 본문은 서버가 알림 종류별로 정한다. 호출자가 임의 문구를 넣어
 *   Spoonie 명의의 피싱 알림을 보낼 수 없게 하기 위함이다.
 * - 클릭 시 이동 URL은 사이트 내부 경로만 허용한다.
 */

const webpush = require('web-push');

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

webpush.setVapidDetails(
  'mailto:spoonie.service@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const TEMPLATES = {
  comment: { title: '새 댓글이 달렸습니다', body: '새로운 댓글이 있습니다' },
  reply: { title: '새 대댓글이 달렸습니다', body: '새로운 답글이 있습니다' },
  like: { title: '새 좋아요가 달렸습니다', body: '새로운 좋아요가 있습니다' },
  follow: { title: '새 팔로워가 생겼습니다', body: '새로운 팔로우가 있습니다' },
  recipe_cited: { title: '내 레시피가 참고되었습니다', body: '새로운 활동이 있습니다' },
  test: { title: '테스트 알림', body: '푸시 알림이 정상적으로 작동합니다' },
};

const ITEM_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function safeInternalPath(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) {
    return '/';
  }
  try {
    const base = 'https://spoonie.invalid';
    const url = new URL(raw, base);
    return url.origin === base ? `${url.pathname}${url.search}` : '/';
  } catch {
    return '/';
  }
}

function isValidSubscription(sub) {
  if (!sub || typeof sub !== 'object' || typeof sub.endpoint !== 'string') return false;
  if (!sub.keys || typeof sub.keys.p256dh !== 'string' || typeof sub.keys.auth !== 'string') return false;
  try {
    return new URL(sub.endpoint).protocol === 'https:';
  } catch {
    return false;
  }
}

async function getAuthenticatedUserId(authHeader) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const match = /^Bearer (.+)$/.exec(authHeader || '');
  if (!match) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${match[1]}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user && typeof user.id === 'string' ? user.id : null;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': APP_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
  const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return reply(405, { error: 'Method not allowed' });
  }

  const userId = await getAuthenticatedUserId(event.headers.authorization || event.headers.Authorization);
  if (!userId) {
    return reply(401, { error: 'Unauthorized' });
  }

  let payloadIn;
  try {
    payloadIn = JSON.parse(event.body || '{}');
  } catch {
    return reply(400, { error: 'Invalid JSON' });
  }

  const { subscription, notification } = payloadIn;
  const template = notification && TEMPLATES[notification.type];
  if (!isValidSubscription(subscription) || !template) {
    return reply(400, { error: 'Invalid request' });
  }

  const itemId = typeof notification.itemId === 'string' && ITEM_ID_PATTERN.test(notification.itemId)
    ? notification.itemId
    : undefined;

  const payload = JSON.stringify({
    title: template.title,
    body: template.body,
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    tag: notification.type,
    data: { url: safeInternalPath(notification.url), itemId },
    actions: [{ action: 'open', title: '확인', icon: '/android-chrome-192x192.png' }],
  });

  try {
    await webpush.sendNotification(subscription, payload);
    return reply(200, { success: true });
  } catch (error) {
    console.error('푸시 발송 실패:', error && error.statusCode, error && error.message);
    return reply(502, { error: 'Push notification failed' });
  }
};
