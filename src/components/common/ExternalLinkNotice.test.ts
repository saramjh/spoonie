import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
import ExternalLinkNotice from './ExternalLinkNotice'

const navigate = vi.hoisted(() => vi.fn())
const selectedUrl = 'https://www.koreanbapsang.com/hobak-jeon-pan-fried-zucchini-in-egg-batter/'

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: () => [new URL('https://www.koreanbapsang.com/hobak-jeon-pan-fried-zucchini-in-egg-batter/'), vi.fn()],
  useEffect: () => {},
}))

function findContinue(node: ReactNode): ReactElement<{ onClick?: () => void }> | null {
  if (Array.isArray(node)) return node.map(findContinue).find(Boolean) ?? null
  if (!node || typeof node !== 'object' || !('props' in node)) return null
  const element = node as ReactElement<{ children?: ReactNode; onClick?: () => void }>
  if (element.props.children === '사이트로 이동') return element
  return findContinue(element.props.children)
}

describe('external link confirmation', () => {
  beforeEach(() => {
    navigate.mockClear()
    vi.stubGlobal('window', { location: { assign: navigate } })
  })

  it('navigates to the confirmed URL directly, without relying on a dismissing anchor', () => {
    const confirm = findContinue(ExternalLinkNotice())
    expect(confirm?.props.onClick).toBeTypeOf('function')
    confirm!.props.onClick!()
    expect(navigate).toHaveBeenCalledExactlyOnceWith(selectedUrl)
  })
})
