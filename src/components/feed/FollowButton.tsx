'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { useToast } from "@/hooks/use-toast"
import { User } from '@supabase/supabase-js'

interface FollowButtonProps {
  userId: string; // The user ID of the person being viewed/followed
  initialIsFollowing: boolean;
}

export default function FollowButton({ userId, initialIsFollowing }: FollowButtonProps) {
  const supabase = createSupabaseBrowserClient()
  const { toast } = useToast();
  
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, [supabase.auth]);

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);


  const handleFollowToggle = async () => {
    if (!currentUser) {
      toast({ title: '로그인 필요', description: '팔로우하려면 로그인이 필요합니다.', variant: 'destructive' });
      return;
    }

    if (currentUser.id === userId) return; // Should not happen due to the check below

    setLoading(true);

    const followerId = currentUser.id;
    const followingId = userId;

    if (isFollowing) {
      // Unfollow logic
      const { error } = await supabase.from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);

      if (error) {
        toast({ title: '언팔로우 실패', description: error.message, variant: 'destructive' });
      } else {
        setIsFollowing(false);
      }
    } else {
      // Follow logic
      const { error } = await supabase.from('follows').insert({
        follower_id: followerId,
        following_id: followingId,
      });

      if (error) {
        toast({ title: '팔로우 실패', description: error.message, variant: 'destructive' });
      } else {
        setIsFollowing(true);
        // Notification logic
        const { error: notificationError } = await supabase.from('notifications').insert({
          user_id: followingId,
          from_user_id: followerId,
          type: 'follow',
          content: `${currentUser.email?.split('@')[0] || '새로운 사용자'}님이 회원님을 팔로우하기 시작했습니다.`,
        });
        if (notificationError) {
          console.error('알림 생성 실패:', notificationError.message);
        }
      }
    }
    setLoading(false);
  }

  // Do not render the button if the user is viewing their own profile
  if (currentUser && currentUser.id === userId) {
    return null;
  }

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      onClick={handleFollowToggle}
      disabled={loading || !currentUser}
      className="w-[80px]"
    >
      {loading ? '처리중...' : (isFollowing ? '팔로잉' : '팔로우')}
    </Button>
  )
}
