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

  // 웨일 브라우저 호환성을 위한 고유 tag 생성
  const uniqueTag = `spoonie-${notificationData.tag}-${Date.now()}`;
  
  const showNotification = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: uniqueTag, // 매번 고유한 태그로 중복 방지
      data: notificationData.data,
      actions: notificationData.actions || [
        {
          action: 'open',
          title: '확인'
        }
      ],
      requireInteraction: true, // 웨일 브라우저에서 더 확실하게 표시
      silent: false,
      vibrate: [200, 100, 200], // 진동 추가 (모바일)
      timestamp: Date.now()
    }
  ).then(() => {
    // 🔄 알림센터 실시간 업데이트: 클라이언트에게 데이터 새로고침 요청
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      clientList.forEach(client => {
        try {
          client.postMessage({
            type: 'NOTIFICATION_RECEIVED',
            data: {
              notificationType: notificationData.type,
              itemId: notificationData.data?.itemId,
              timestamp: Date.now()
            }
          });
        } catch (error) {
          console.warn('클라이언트 메시지 전송 실패:', error);
        }
      });
    });
  }).catch(error => {
    console.error('알림 표시 실패:', error);
  });

  event.waitUntil(showNotification);
});

// 알림 클릭 처리
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  
  // 절대 URL로 변환 (localhost 대응)
  const fullUrl = urlToOpen.startsWith('http') ? urlToOpen : 
                  `${self.location.origin}${urlToOpen.startsWith('/') ? '' : '/'}${urlToOpen}`;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(function(windowClients) {
    // 이미 열린 탭이 있으면 해당 탭으로 포커스하고 이동
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      
      if (client.url.includes(self.location.origin)) {
        return client.navigate(fullUrl).then(() => {
          return client.focus();
        });
      }
    }
    
    // 새 탭으로 열기
    return clients.openWindow(fullUrl);
  }).catch(error => {
    console.error('알림 클릭 처리 실패:', error);
  });

  event.waitUntil(promiseChain);
});

// 알림 닫기 처리
self.addEventListener('notificationclose', function(event) {
  // 필요시 분석 데이터 전송
});