/**
 * 🆓 완전 무료 푸시 알림 서비스
 * Netlify Functions + Web Push API 사용
 * 외부 서비스 비용 0원
 */

const webpush = require('web-push');

// VAPID 키 설정 (환경변수에서 읽기)
webpush.setVapidDetails(
  'mailto:spoonie.service@gmail.com', // 실제 이메일 주소로 변경
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { subscription, notification } = JSON.parse(event.body);

    // 푸시 메시지 구성
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body || '',
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
      tag: notification.type,
      data: {
        url: notification.url || '/',
        itemId: notification.itemId
      },
      actions: [
        {
          action: 'open',
          title: '확인',
          icon: '/android-chrome-192x192.png'
        }
      ]
    });

    // 🆓 Web Push API로 무료 발송
    await webpush.sendNotification(subscription, payload);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error('❌ 푸시 발송 실패:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Push notification failed',
        details: error.message 
      })
    };
  }
};