/**
 * 🆓 무료 푸시 알림 설정 컴포넌트
 * 사용자가 푸시 알림을 켜고 끌 수 있는 UI
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Smartphone, AlertCircle } from 'lucide-react';
import { usePushNotification } from '@/hooks/usePushNotification';
import { useToast } from '@/hooks/use-toast';

export default function PushNotificationSettings() {
  const { toast } = useToast();
  const {
    isSupported,
    isSubscribed,
    isLoading,
    subscribeToPush,
    unsubscribeFromPush
  } = usePushNotification();

  const handleTogglePush = async () => {
    try {
      if (isSubscribed) {
        await unsubscribeFromPush();
        toast({
          title: "푸시 알림 해제됨",
          description: "더 이상 푸시 알림을 받지 않습니다.",
        });
      } else {
        const success = await subscribeToPush();
        if (success) {
          toast({
            title: "푸시 알림 활성화됨",
            description: "이제 브라우저가 닫혀있어도 알림을 받을 수 있습니다!",
          });
        }
      }
    } catch (error) {
      toast({
        title: "오류가 발생했습니다",
        description: "푸시 알림 설정 중 문제가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  if (!isSupported) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            푸시 알림 미지원
          </CardTitle>
          <CardDescription>
            현재 브라우저에서는 푸시 알림을 지원하지 않습니다.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          푸시 알림 설정
        </CardTitle>
        <CardDescription>
          브라우저가 닫혀있어도 새로운 댓글, 좋아요, 팔로우 알림을 받을 수 있습니다.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <Bell className="h-5 w-5 text-green-600" />
            ) : (
              <BellOff className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <p className="font-medium">
                {isSubscribed ? '푸시 알림 켜짐' : '푸시 알림 꺼짐'}
              </p>
              <p className="text-sm text-gray-500">
                {isSubscribed 
                  ? '실시간 알림을 받고 있습니다' 
                  : '브라우저가 열려있을 때만 알림을 받습니다'
                }
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleTogglePush}
          disabled={isLoading}
          variant={isSubscribed ? "outline" : "default"}
          className="w-full"
        >
          {isLoading ? (
            "처리 중..."
          ) : isSubscribed ? (
            <>
              <BellOff className="mr-2 h-4 w-4" />
              푸시 알림 끄기
            </>
          ) : (
            <>
              <Bell className="mr-2 h-4 w-4" />
              푸시 알림 켜기
            </>
          )}
        </Button>


      </CardContent>
    </Card>
  );
}