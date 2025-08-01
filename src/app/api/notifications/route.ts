/**
 * 🗑️ 알림 관리 API
 * 알림 삭제, 읽음 처리, 일괄 작업 지원
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { z } from 'zod'

// ================================
// 1. 요청 스키마 검증
// ================================

const deleteNotificationSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1).max(100), // 최대 100개까지
  action: z.enum(['delete', 'mark_read'])
})

// ================================
// 2. 알림 삭제/업데이트 API
// ================================

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 요청 본문 파싱
    const body = await request.json()
    const parseResult = deleteNotificationSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request', 
          details: parseResult.error.issues 
        },
        { status: 400 }
      )
    }

    const { notificationIds, action } = parseResult.data

    // 알림 소유권 확인
    const { data: notifications, error: ownershipError } = await supabase
      .from('notifications')
      .select('id, user_id')
      .in('id', notificationIds)

    if (ownershipError) {
      return NextResponse.json(
        { error: 'Failed to verify ownership' },
        { status: 500 }
      )
    }

    // 본인 알림인지 확인
    const unauthorizedNotifications = notifications?.filter(n => n.user_id !== user.id) || []
    if (unauthorizedNotifications.length > 0) {
      return NextResponse.json(
        { error: 'You can only modify your own notifications' },
        { status: 403 }
      )
    }

    // 존재하지 않는 알림 확인
    const existingIds = notifications?.map(n => n.id) || []
    const missingIds = notificationIds.filter(id => !existingIds.includes(id))
    if (missingIds.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some notifications not found',
          missingIds 
        },
        { status: 404 }
      )
    }

    // 액션 실행
    let result
    if (action === 'delete') {
      // 알림 삭제
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds)
        .eq('user_id', user.id) // 추가 보안

      if (deleteError) {
        throw deleteError
      }

      result = { 
        message: `${notificationIds.length}개의 알림이 삭제되었습니다.`,
        deletedCount: notificationIds.length
      }

    } else if (action === 'mark_read') {
      // 읽음 처리
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds)
        .eq('user_id', user.id) // 추가 보안

      if (updateError) {
        throw updateError
      }

      result = { 
        message: `${notificationIds.length}개의 알림을 읽음으로 표시했습니다.`,
        updatedCount: notificationIds.length
      }
    }

    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('❌ Notification API error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================
// 3. 알림 목록 조회 API (무한 스크롤)
// ================================

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '0')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50) // 최대 50개
    const offset = page * limit

    // 알림 조회
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select(`
        id,
        created_at,
        type,
        is_read,
        item_id,
        from_profile:profiles!notifications_from_user_id_fkey ( public_id, username, avatar_url ),
        related_item:items!notifications_item_id_fkey ( item_type )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    // 데이터 변환
    const transformedData = (notifications || []).map((item: any) => ({
      id: item.id,
      created_at: item.created_at,
      type: item.type,
      is_read: item.is_read,
      item_id: item.item_id,
      from_profile: Array.isArray(item.from_profile) 
        ? item.from_profile[0] || null 
        : item.from_profile,
      related_item: Array.isArray(item.related_item) 
        ? item.related_item[0] || null 
        : item.related_item,
    }))

    return NextResponse.json({
      notifications: transformedData,
      page,
      limit,
      hasMore: transformedData.length === limit
    })

  } catch (error) {
    console.error('❌ Notification fetch error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================
// 4. 읽지 않은 알림 수 조회 API
// ================================

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const action = body.action

    if (action === 'get_unread_count') {
      // 읽지 않은 알림 수 조회
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) {
        throw error
      }

      return NextResponse.json({
        unreadCount: count || 0
      })

    } else if (action === 'mark_all_read') {
      // 모든 알림 읽음 처리
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        message: '모든 알림을 읽음으로 표시했습니다.'
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ Notification action error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}