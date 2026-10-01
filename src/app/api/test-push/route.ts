import { NextRequest, NextResponse } from 'next/server'

// 개발 환경에서만 실제 푸시 테스트를 위한 API
export async function POST(request: NextRequest) {
  // 프로덕션에서는 사용 금지
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const webpush = require('web-push')
    const { subscription, notification } = await request.json()

    // VAPID 키 설정
    webpush.setVapidDetails(
      'mailto:spoonie.service@gmail.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )

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
    })

    // 로컬에서도 실제 web-push 발송
    await webpush.sendNotification(subscription, payload)

    return NextResponse.json({ 
      success: true, 
      message: '푸시 알림이 발송되었습니다!'
    })

  } catch (error) {
    console.error('개발 환경 푸시 실패:', error)
    return NextResponse.json(
      { error: '푸시 발송 실패', details: (error as Error).message },
      { status: 500 }
    )
  }
}