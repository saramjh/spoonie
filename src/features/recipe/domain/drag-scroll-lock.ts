// A drag temporarily owns the body scroll lock, then restores the prior styles.
export function lockDragBodyScroll(body: HTMLElement): () => void {
  const { overflow, touchAction } = body.style
  body.style.overflow = "hidden"
  body.style.touchAction = "none"
  let released = false
  return () => {
    if (released) return
    released = true
    body.style.overflow = overflow
    body.style.touchAction = touchAction
  }
}
