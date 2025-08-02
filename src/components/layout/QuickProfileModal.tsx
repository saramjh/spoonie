'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"
import { createSupabaseBrowserClient } from '@/lib/supabase'
import useSWR from 'swr'
import { Settings, LogOut, PlusCircle, User as UserIcon } from 'lucide-react'

interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

const fetchUserProfile = async (userId: string) => {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase
    .from("profiles")
    .select(`id, username, avatar_url`)
    .eq("id", userId)
    .single()
  if (error) throw error
  return data as UserProfile
}

const fetchFollowCounts = async (userId: string) => {
  const supabase = createSupabaseBrowserClient()
  const { count: followersCount, error: followersError } = await supabase
    .from('follows')
    .select('id', { count: 'exact' })
    .eq('following_id', userId)

  const { count: followingCount, error: followingError } = await supabase
    .from('follows')
    .select('id', { count: 'exact' })
    .eq('follower_id', userId)

  if (followersError || followingError) {
    throw followersError || followingError
  }
  return { followers: followersCount || 0, following: followingCount || 0 }
}

const fetchRecipeCount = async (userId: string) => {
    const supabase = createSupabaseBrowserClient()
    const { count, error } = await supabase
      .from('recipes')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
  
    if (error) throw error
    return count || 0
}

interface QuickProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function QuickProfileModal({ isOpen, onClose, user }: QuickProfileModalProps) {
  const supabase = createSupabaseBrowserClient()

  const { data: profile, isLoading: profileLoading } = useSWR(user ? `user_profile_${user.id}` : null, () => fetchUserProfile(user.id))
  const { data: followCounts, isLoading: followLoading } = useSWR(user ? `follow_counts_${user.id}` : null, () => fetchFollowCounts(user.id))
  const { data: recipeCount, isLoading: recipeLoading } = useSWR(user ? `recipe_count_${user.id}` : null, () => fetchRecipeCount(user.id))

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (!user) return null

  const isLoading = profileLoading || followLoading || recipeLoading;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-4">
                {profile?.avatar_url ? (
                    <Image src={profile.avatar_url} alt="User Avatar" width={48} height={48} className="rounded-full object-cover" />
                ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-gray-500" />
                    </div>
                )}
                <span>{profile?.username || user.email}</span>
            </DrawerTitle>
            <DrawerDescription className="pt-4">
                <div className="flex justify-around text-center">
                    <div>
                        <p className="text-lg font-bold">{isLoading ? '-' : recipeCount}</p>
                        <p className="text-sm text-gray-500">레시피</p>
                    </div>
                    <div>
                        <p className="text-lg font-bold">{isLoading ? '-' : followCounts?.followers}</p>
                        <p className="text-sm text-gray-500">팔로워</p>
                    </div>
                    <div>
                        <p className="text-lg font-bold">{isLoading ? '-' : followCounts?.following}</p>
                        <p className="text-sm text-gray-500">팔로잉</p>
                    </div>
                </div>
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-2">
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <Link href="/profile" onClick={onClose}>
                <UserIcon className="w-4 h-4" /> 마이페이지로 이동
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <Link href="/recipes/new" onClick={onClose}>
                <PlusCircle className="w-4 h-4" /> 새 레시피 작성
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={handleLogout}>
              <LogOut className="w-4 h-4" /> 로그아웃
            </Button>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">닫기</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
