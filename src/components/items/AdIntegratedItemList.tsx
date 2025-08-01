/**
 * 🎨 토스 스타일 광고 통합 아이템 리스트
 * 
 * 핵심 UX 원칙:
 * 1. 3:1 비율로 자연스러운 광고 배치
 * 2. 콘텐츠와 조화로운 디자인 
 * 3. 명확한 광고 구분
 * 4. 성능 최적화 (지연 로딩)
 */

"use client"

import { useInView } from 'react-intersection-observer'
import PostCard from './PostCard'
import TossStyleAdBanner from '@/components/ads/TossStyleAdBanner'
import { TossAnalyticsEvents } from '@/components/analytics/GoogleAnalytics'
import type { Item } from '@/types/item'

interface AdIntegratedItemListProps {
  items: Item[]
  currentUserId?: string
}

export default function AdIntegratedItemList({ 
  items, 
  currentUserId 
}: AdIntegratedItemListProps) {

  // 🎯 토스 스타일 광고 삽입 로직 (3:1 비율)
  const insertAdsIntoItems = (items: Item[]) => {
    const result: (Item | { type: 'ad'; id: string; position: number })[] = []
    
    items.forEach((item, index) => {
      result.push(item)
      
      // 3번째마다 광고 삽입 (3, 6, 9, 12...)
      if ((index + 1) % 3 === 0 && index < items.length - 1) {
        result.push({
          type: 'ad',
          id: `feed-ad-${Math.floor(index / 3) + 1}`,
          position: index + 1
        })
      }
    })
    
    return result
  }

  const itemsWithAds = insertAdsIntoItems(items)

  return (
    <div className="space-y-4 pb-20">
      {itemsWithAds.map((item, index) => {
        // 🎯 광고 아이템 렌더링
        if ('type' in item && item.type === 'ad') {
          return (
            <AdInFeedItem 
              key={item.id}
              adId={item.id}
              position={item.position}
            />
          )
        }
        
        // 📱 일반 아이템 렌더링
        return (
          <PostCard
            key={(item as Item).item_id || (item as Item).id}
            item={item as Item}
            currentUser={currentUserId ? { id: currentUserId } as any : null}
          />
        )
      })}
    </div>
  )
}

// 🎨 토스 스타일 피드 내 광고 컴포넌트
function AdInFeedItem({ adId, position }: { adId: string; position: number }) {
  const { ref, inView } = useInView({ 
    triggerOnce: true,
    threshold: 0.3
  })

  // 🎯 광고 노출 추적
  const handleAdImpression = () => {
    TossAnalyticsEvents.adView(adId, `feed-position-${position}`)
  }

  // 🎯 광고 클릭 추적  
  const handleAdClick = () => {
    TossAnalyticsEvents.adClick(adId, `feed-position-${position}`)
  }

  return (
    <div ref={ref} className="my-6">
      {inView && (
        <div onClick={handleAdClick} onLoad={handleAdImpression}>
          <TossStyleAdBanner 
            slot="9876543210" // 실제 AdSense 슬롯 ID로 교체
            format="rectangle"
            className="mx-auto max-w-sm"
            style={{
              maxWidth: '320px',
              height: '250px'
            }}
          />
        </div>
      )}
    </div>
  )
}

// 🎨 토스 스타일 검색 결과 광고 (보너스)
export function SearchResultAdBanner() {
  const { ref, inView } = useInView({ triggerOnce: true })

  return (
    <div ref={ref} className="my-4">
      {inView && (
        <TossStyleAdBanner 
          slot="1234567890" // 검색 결과용 슬롯 ID
          format="horizontal"
          className="w-full"
          style={{
            height: '90px'
          }}
        />
      )}
    </div>
  )
}