/**
 * 알림 푸시 발송 (DB 트리거가 호출)
 *
 * notifications 테이블에 행이 추가되면 Supabase(pg_net)가 이 함수를 호출한다.
 * - 공유 비밀값(x-webhook-secret)으로 호출자를 검증한다.
 * - 서버용 비밀 키로 알림과 수신자의 구독 정보를 읽는다. 구독 정보는 외부에 공개되지 않는다.
 * - 만료된 구독(404/410)은 꺼서 다음부터 호출하지 않게 한다.
 *
 * 필요한 환경변수: PUSH_WEBHOOK_SECRET, SUPABASE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL,
 *                 VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
 */

const crypto = require('crypto');
const webpush = require('web-push');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.PUSH_WEBHOOK_SECRET;

webpush.setVapidDetails(
  'mailto:spoonie.service@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const reply = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

function isValidSecret(received) {
  if (!WEBHOOK_SECRET || WEBHOOK_SECRET.length < 32 || typeof received !== 'string') return false;
  const a = Buffer.from(received);
  const b = Buffer.from(WEBHOOK_SECRET);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SECRET_KEY, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
}

function buildMessage(notification) {
  const actor = notification.from_user || {};
  const name = actor.display_name || actor.username || '누군가';
  const item = notification.item || {};
  const itemLabel = item.item_type === 'recipe' ? '레시피' : '레시피드';
  const itemPath = item.item_type === 'recipe' ? 'recipes' : 'posts';

  switch (notification.type) {
    case 'like':
      return { title: `${name}님이 회원님의 ${itemLabel}를 좋아합니다`, body: item.title || '', url: `/${itemPath}/${notification.item_id}` };
    case 'comment':
      return { title: `${name}님이 댓글을 남겼습니다`, body: item.title || '', url: `/${itemPath}/${notification.item_id}#comments` };
    case 'follow':
      return { title: `${name}님이 회원님을 팔로우합니다`, body: '', url: actor.public_id ? `/profile/${actor.public_id}` : '/notifications' };
    case 'recipe_cited':
      {
        // 관계 종류에 따라 다르게 알린다: 만들어 봄 / 참고한 레시피드 / 이어 쓴 레시피
        const made = item.item_type === 'post' && (item.creation_origin === 'recipe_detail' || item.creation_origin === 'cook_mode');
        const title = item.item_type === 'recipe'
          ? `${name}님이 회원님의 레시피를 참고해 새 레시피를 썼어요`
          : made ? `${name}님이 회원님의 레시피로 만들어 봤어요` : `${name}님이 회원님의 레시피를 참고했어요`;
        return { title, body: item.title || '', url: `/${itemPath}/${notification.item_id}` };
      }
    default:
      return { title: '새 알림이 있습니다', body: '', url: '/notifications' };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  if (!isValidSecret(event.headers['x-webhook-secret'])) return reply(401, { error: 'Unauthorized' });
  if (!SUPABASE_URL || !SECRET_KEY) return reply(500, { error: 'Server not configured' });

  let notificationId;
  try {
    notificationId = JSON.parse(event.body || '{}').notification_id;
  } catch {
    return reply(400, { error: 'Invalid JSON' });
  }
  if (typeof notificationId !== 'string' || !/^[0-9a-f-]{36}$/i.test(notificationId)) {
    return reply(400, { error: 'Invalid notification_id' });
  }

  try {
    const [notification] = await rest(
      `notifications?id=eq.${notificationId}&select=id,user_id,type,item_id,` +
        `from_user:profiles!notifications_from_user_id_fkey(username,display_name,public_id),` +
        `item:items!notifications_item_id_fkey(item_type,title,creation_origin)`
    );
    if (!notification) return reply(404, { error: 'Notification not found' });

    const [settings] = await rest(
      `user_push_settings?user_id=eq.${notification.user_id}&enabled=eq.true&select=subscription_data`
    );
    if (!settings || !settings.subscription_data) return reply(200, { skipped: 'push disabled' });

    const message = buildMessage(notification);
    const payload = JSON.stringify({
      title: message.title,
      body: message.body,
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
      tag: `${notification.type}-${notification.item_id || notification.id}`,
      data: { url: message.url, itemId: notification.item_id },
    });

    try {
      await webpush.sendNotification(settings.subscription_data, payload);
    } catch (error) {
      // 만료되었거나 해지된 구독은 꺼 둔다 (사용자가 다시 켜면 새 구독이 저장된다)
      if (error && (error.statusCode === 404 || error.statusCode === 410)) {
        await rest(`user_push_settings?user_id=eq.${notification.user_id}`, {
          method: 'PATCH',
          body: JSON.stringify({ enabled: false }),
        });
        return reply(200, { skipped: 'subscription expired' });
      }
      throw error;
    }

    return reply(200, { success: true });
  } catch (error) {
    console.error('push-dispatch 실패:', error && error.statusCode, error && error.message);
    return reply(502, { error: 'Push dispatch failed' });
  }
};
