import { tokenizeTextLinks } from '@/shared/lib/external-text-links'

/** React-escaped member prose: no Markdown/HTML execution, only HTTP(S) anchors. */
export default function LinkifiedText({ text }: { text: string | null | undefined }) {
  return <>{tokenizeTextLinks(text ?? '').map((part, i) => part.href
    ? <a key={i} href={part.href} target="_blank" rel="noopener noreferrer nofollow ugc"
        className="font-medium text-ink underline decoration-ink-soft underline-offset-2 hover:decoration-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">{part.text}</a>
    : <span key={i}>{part.text}</span>)}</>
}
