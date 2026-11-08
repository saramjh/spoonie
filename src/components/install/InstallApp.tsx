"use client"

import { useState, useSyncExternalStore } from "react"
import { X } from "lucide-react"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { chromeIntentUrl, installPath, isSamsungInternet, isStandalone, onInstallChange, promptInstall, type InstallPath } from "@/shared/lib/install"

// 서버 렌더에서는 브라우저를 모르므로 null
const useInstallPath = () => useSyncExternalStore<InstallPath | null>(onInstallChange, installPath, () => null)

/** 설정 화면의 "앱으로 설치" 한 줄: 브라우저에 맞는 설치 방법 하나만 보여 준다 */
export function InstallAppRow() {
  const path = useInstallPath()
  const [open, setOpen] = useState(false)
  if (!path) return null
  if (path === "installed") return <p className="mt-3 text-body text-ink-soft">지금 앱으로 쓰고 있어요.</p>

  const instruction = path === "open-in-chrome"
    ? "삼성 인터넷 대신 크롬에서 열어 주세요. 설치할 때 Play 프로텍트 경고가 날 수 있어요."
    : path === "ios"
      ? "사파리 아래쪽 공유 버튼을 누른 뒤 '홈 화면에 추가'를 선택하세요."
      : path === "browser-menu"
        ? "브라우저의 공유 또는 메뉴에서 '홈 화면에 추가'를 선택하세요."
        : "지원하는 브라우저에서 설치 버튼을 눌러 홈 화면에 추가하세요."

  return <>
    <Button type="button" variant="outline" className="mt-3 w-full justify-start" onClick={() => setOpen(true)}>
      홈 화면에 앱 설치
    </Button>
    <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
      <DrawerContent className="mx-auto max-w-md rounded-t-2xl px-4 pb-6 pt-4">
        <div className="flex items-center justify-between">
          <DrawerTitle className="text-title font-semibold text-ink">Spoonie를 홈 화면에</DrawerTitle>
          <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="닫기">
            <X className="h-5 w-5" aria-hidden />
          </Button>
        </div>
        <DrawerDescription className="mt-4 text-label text-ink-soft">
          지원하는 브라우저에서 홈 화면에 추가하면 더 쉽게 꺼내 볼 수 있어요.
        </DrawerDescription>
        <p className="mt-4 text-label text-ink">{instruction}</p>
        <div className="mt-5 flex gap-2">
          <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => setOpen(false)}>나중에</Button>
          {path === "prompt" ? (
            <Button type="button" className="h-12 flex-1" onClick={() => { setOpen(false); void promptInstall() }}>앱 설치</Button>
          ) : path === "open-in-chrome" ? (
            <Button asChild className="h-12 flex-1"><a href={chromeIntentUrl()} onClick={() => setOpen(false)}>크롬에서 열기</a></Button>
          ) : (
            <Button type="button" className="h-12 flex-1" onClick={() => setOpen(false)}>알겠어요</Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  </>
}

const DISMISS_KEY = "spoonie-samsung-install-notice"

/**
 * 삼성 인터넷 방문자에게만, 주소창의 설치 버튼을 누르기 전에 한 번 알려 준다.
 * 닫으면 이 기기에서는 다시 띄우지 않는다.
 */
function noticeWanted() {
	if (!isSamsungInternet() || !/Android/i.test(navigator.userAgent) || isStandalone()) return false
	try {
		return !localStorage.getItem(DISMISS_KEY)
	} catch {
		return true // 저장소를 못 쓰면 매번 보여도 괜찮다
	}
}
const noSubscribe = () => () => {}

export function SamsungInstallNotice() {
	const wanted = useSyncExternalStore(noSubscribe, noticeWanted, () => false)
	const [dismissed, setDismissed] = useState(false)
	if (!wanted || dismissed) return null

	const dismiss = () => {
		setDismissed(true)
		try {
			localStorage.setItem(DISMISS_KEY, "1")
		} catch {
			// 무시
		}
	}

	return (
		<div role="note" className="mx-3 mt-3 flex items-start gap-3 rounded-[3px] bg-paper px-4 py-3 shadow-sheet">
			<p className="flex-1 text-meta text-ink-soft">
				앱으로 설치하려면 크롬에서 열어 주세요. 삼성 인터넷으로 설치하면 &lsquo;안전하지 않은 앱&rsquo; 경고가 떠요.{" "}
				<a href={chromeIntentUrl()} onClick={dismiss} className="font-semibold text-ink underline underline-offset-4">
					크롬에서 열기
				</a>
			</p>
			<button type="button" onClick={dismiss} aria-label="안내 닫기" className="-m-2 inline-flex h-10 w-10 shrink-0 items-center justify-center text-ink-soft">
				<X className="h-4 w-4" aria-hidden />
			</button>
		</div>
	)
}
