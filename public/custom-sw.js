/**
 * 🆓 무료 푸시 알림 Service Worker
 * 기본 PWA Service Worker에 추가되는 커스텀 코드
 */

// 푸시 메시지 수신 처리
self.addEventListener('push', function(event) {

  let notificationData = {
    title: '새 알림',
    body: '새로운 활동이 있습니다.',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    tag: 'default',
    data: { url: '/' }
  };

  // 푸시 데이터 파싱
  if (event.data) {
    try {
      notificationData = { ...notificationData, ...event.data.json() };
    } catch (e) {
      console.warn('푸시 데이터 파싱 실패:', e);
    }
  }

  // 알림 표시
  const showNotification = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      actions: notificationData.actions || [
        {
          action: 'open',
          title: '확인'
        }
      ],
      requireInteraction: false,
      silent: false
    }
  );

  event.waitUntil(showNotification);
});

// 알림 클릭 처리
self.addEventListener('notificationclick', function(event) {

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(function(windowClients) {
    // 이미 열린 탭이 있으면 해당 탭으로 포커스
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      if (client.url.includes(self.location.origin)) {
        client.navigate(urlToOpen);
        return client.focus();
      }
    }
    
    // 열린 탭이 없으면 새 탭 열기
    return clients.openWindow(urlToOpen);
  });

  event.waitUntil(promiseChain);
});

// 알림 닫기 처리
self.addEventListener('notificationclose', function(event) {
  // 필요시 분석 데이터 전송
});