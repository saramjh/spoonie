"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, type NodeViewProps } from "@tiptap/react"
import { Node, type Editor } from "@tiptap/core"
import Document from "@tiptap/extension-document"
import Paragraph from "@tiptap/extension-paragraph"
import Text from "@tiptap/extension-text"
import HardBreak from "@tiptap/extension-hard-break"
import { UndoRedo } from "@tiptap/extensions"
import { ChefHat } from "lucide-react"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { useCitedRecipes } from "@/features/recipe/hooks/useCitedRecipes"
import { searchCitableRecipes } from "@/features/recipe/data/recipe-repository"
import { Photo } from "@/components/kit"
import { cn } from "@/lib/utils"
import type { Item } from "@/types/item"
import {
  docToStoredText,
  isRecipeReferenceId,
  recipeReferenceIds,
  storedTextToDoc,
} from "@/features/recipe/domain/inline-recipe-reference"

type Trigger = { from: number; to: number; query: string }

function InlineRecipeNodeView({ node, selected }: NodeViewProps) {
  const title = typeof node.attrs.title === "string" ? node.attrs.title : "레시피"
  const image = typeof node.attrs.imageUrl === "string" ? node.attrs.imageUrl : null
  return (
    <NodeViewWrapper
      data-recipe-mention-id={node.attrs.recipeId}
      contentEditable={false}
      title={title}
      aria-label={"인용 레시피: " + title}
      className={cn(
        "mx-0.5 inline-flex max-w-[min(15rem,75vw)] select-none items-center gap-1 align-baseline rounded-[6px] border border-border bg-paper-tint px-1.5 py-0.5 text-[0.9em] font-medium leading-tight text-ink",
        selected && "outline outline-2 outline-offset-1 outline-primary"
      )}
    >
      {image ? (
        <span className="relative inline-block h-[17px] w-[17px] shrink-0 overflow-hidden rounded-[3px]">
          <Photo src={image} sizes="17px" />
        </span>
      ) : <ChefHat className="h-[14px] w-[14px] shrink-0" aria-hidden />}
      <span className="truncate">{title}</span>
    </NodeViewWrapper>
  )
}

const RecipeMentionNode = Node.create({
  name: "recipeMention",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      recipeId: { default: null },
      title: { default: null },
      imageUrl: { default: null },
    }
  },
  parseHTML() {
    return [{ tag: "span[data-recipe-mention-id]", getAttrs: element => {
      const id = (element as HTMLElement).getAttribute("data-recipe-mention-id")
      return isRecipeReferenceId(id) ? { recipeId: id } : false
    } }]
  },
  renderHTML({ node }) {
    return ["span", { "data-recipe-mention-id": node.attrs.recipeId }, node.attrs.title || "레시피"]
  },
  addNodeView() {
    return ReactNodeViewRenderer(InlineRecipeNodeView)
  },
})

type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
  compact?: boolean
  className?: string
  "aria-label"?: string
}

export default function InlineRecipeEditor({
  id, value, onChange, placeholder, disabled = false, compact = false, className, "aria-label": ariaLabel,
}: Props) {
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  const [trigger, setTrigger] = useState<Trigger | null>(null)
  const [search, setSearch] = useState<{ key: string; rows: Item[]; loading: boolean; error: boolean }>({ key: "", rows: [], loading: false, error: false })
  const queryKey = trigger ? trigger.from + ":" + trigger.query : ""
  const results = useMemo(() => search.key === queryKey ? search.rows : [], [search, queryKey])
  // 검색어가 바뀐 직후의 debounce 동안 '결과 없음'을 잘못 보여주지 않는다.
  const loading = !!trigger && trigger.query.trim().length >= 2 && (search.key !== queryKey || search.loading)
  const failed = search.key === queryKey && search.error
  const [activeIndex, setActiveIndex] = useState(0)
  const dismissed = useRef<string | null>(null)
  const latest = useRef<{ trigger: Trigger | null; results: Item[]; activeIndex: number; insert: (item: Item) => void }>({
    trigger: null, results: [], activeIndex: 0, insert: () => {},
  })

  const updateTrigger = useCallback((nextEditor: Editor) => {
    if (nextEditor.view.composing || !nextEditor.state.selection.empty) {
      setTrigger(null)
      return
    }
    const { $from, from } = nextEditor.state.selection
    if (!$from.parent.isTextblock) {
      setTrigger(null)
      return
    }
    const preceding = $from.parent.textBetween(0, $from.parentOffset)
    const match = preceding.match(/\[\[([^\]\n]{0,48})$/)
    const next = match ? { from: from - match[0].length, to: from, query: match[1] } : null
    if (next && dismissed.current === next.from + ":" + next.query) {
      setTrigger(null)
      return
    }
    setTrigger(current => current?.from === next?.from && current?.to === next?.to && current?.query === next?.query ? current : next)
  }, [])

  const editor = useEditor({
    extensions: [Document, Paragraph, Text, HardBreak, UndoRedo, RecipeMentionNode],
    content: storedTextToDoc(value),
    immediatelyRender: false,
    editable: !disabled,
    editorProps: {
      attributes: {
        id: id || "",
        role: "textbox",
        "aria-label": ariaLabel || placeholder,
        "aria-multiline": "true",
        class: "min-h-14 w-full whitespace-pre-wrap break-words outline-none focus-visible:outline-none [&_p]:min-h-[1.4em]",
      },
      handleKeyDown: (_view, event) => {
        const current = latest.current
        if (!current.trigger || event.isComposing || event.keyCode === 229) return false
        if (event.key === "Escape") {
          dismissed.current = current.trigger.from + ":" + current.trigger.query
          setTrigger(null)
          return true
        }
        if (event.key === "ArrowDown" && current.results.length) {
          event.preventDefault()
          setActiveIndex(index => (index + 1) % current.results.length)
          return true
        }
        if (event.key === "ArrowUp" && current.results.length) {
          event.preventDefault()
          setActiveIndex(index => (index - 1 + current.results.length) % current.results.length)
          return true
        }
        if (event.key === "Enter" && current.results.length) {
          event.preventDefault()
          current.insert(current.results[current.activeIndex] ?? current.results[0])
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor: next }) => {
      const text = docToStoredText(next.getJSON())
      onChangeRef.current(text)
      updateTrigger(next)
    },
    onSelectionUpdate: ({ editor: next }) => updateTrigger(next),
  }, [])

  // External restore (edit/draft recovery, successful comment submit) must
  // not reset the selection during ordinary typing or IME composition.
  useEffect(() => {
    if (!editor || editor.view.composing) return
    if (docToStoredText(editor.getJSON()) !== value) {
      editor.commands.setContent(storedTextToDoc(value), { emitUpdate: false })
    }
  }, [editor, value])
  useEffect(() => {
    if (editor && editor.isEditable === disabled) editor.setEditable(!disabled)
  }, [editor, disabled])

  const { citedRecipes } = useCitedRecipes(recipeReferenceIds(value))
  useEffect(() => {
    if (!editor || citedRecipes.length === 0) return
    const byId = new Map(citedRecipes.map(recipe => [recipe.id, recipe]))
    const transaction = editor.state.tr
    editor.state.doc.descendants((node, position) => {
      if (node.type.name !== "recipeMention") return
      const recipe = byId.get(node.attrs.recipeId)
      if (!recipe) return
      const title = recipe.title || "레시피"
      const imageUrl = recipe.image_urls?.[0] ?? null
      if (node.attrs.title !== title || node.attrs.imageUrl !== imageUrl) {
        transaction.setNodeMarkup(position, undefined, { ...node.attrs, title, imageUrl })
      }
    })
    if (transaction.docChanged) editor.view.dispatch(transaction.setMeta("addToHistory", false))
  }, [editor, citedRecipes])

  const insert = useCallback((recipe: Item) => {
    if (!editor || !latest.current.trigger) return
    const { from, to } = latest.current.trigger
    editor.chain().focus().insertContentAt({ from, to }, [
      { type: "recipeMention", attrs: { recipeId: recipe.id, title: recipe.title, imageUrl: recipe.image_urls?.[0] ?? null } },
      { type: "text", text: " " },
    ]).run()
    dismissed.current = null
    setTrigger(null)
    setSearch({ key: "", rows: [], loading: false, error: false })
  }, [editor])

  useEffect(() => {
    latest.current = { trigger, results, activeIndex, insert }
  }, [trigger, results, activeIndex, insert])

  useEffect(() => {
    if (!trigger || trigger.query.trim().length < 2) return
    const controller = new AbortController()
    const key = trigger.from + ":" + trigger.query
    const timer = window.setTimeout(async () => {
      setSearch({ key, rows: [], loading: true, error: false })
      try {
        const rows = await searchCitableRecipes(createSupabaseBrowserClient(), trigger.query.trim(), controller.signal)
        if (!controller.signal.aborted) {
          setSearch({ key, rows: rows.slice(0, 6), loading: false, error: false })
          setActiveIndex(0)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Inline recipe lookup failed", error)
          setSearch({ key, rows: [], loading: false, error: true })
        }
      }
    }, 300)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [trigger])

  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <div
        className={cn("relative rounded-lg border border-ink/25 bg-paper px-3 py-2 text-body text-ink focus-within:ring-2 focus-within:ring-ring", compact && "border-0 bg-transparent px-1 py-1.5 focus-within:ring-0")}
        onCompositionEnd={() => { if (editor) updateTrigger(editor) }}
      >
        <EditorContent editor={editor} />
        {!value && !editor?.isFocused && <span className="pointer-events-none absolute left-3 top-2 text-ink-soft" aria-hidden>{placeholder}</span>}
      </div>
      <div className={cn("mt-1.5 flex justify-end", compact && "mt-1")}>
        <button
          type="button"
          aria-label="레시피 인용"
          title="[[를 입력해도 레시피를 연결할 수 있어요"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-paper px-2.5 py-1 text-caption font-medium text-ink-soft transition-colors hover:border-ink/30 hover:bg-paper-tint hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          onClick={() => editor?.chain().focus().insertContent("[[").run()}
          disabled={disabled || !editor}
        >
          <ChefHat className="h-3.5 w-3.5 text-orange-ink" aria-hidden />
          <span>레시피 인용</span>
          <kbd aria-hidden className="rounded-[5px] border border-border bg-paper-tint px-1.5 py-0.5 font-mono text-[11px] leading-none text-ink-soft">[[</kbd>
        </button>
      </div>
      {trigger && (
        <div role="listbox" aria-label="인용할 레시피" className="absolute inset-x-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-paper p-1 shadow-md">
          {trigger.query.trim().length < 2 && <p className="px-2 py-2 text-caption text-ink-soft">레시피 이름을 두 글자 이상 입력하세요.</p>}
          {loading && <p role="status" className="px-3 py-2 text-caption text-ink-soft">레시피 찾는 중…</p>}
          {!loading && failed && <p role="alert" className="px-2 py-2 text-caption text-ink-soft">검색 연결을 확인해 주세요.</p>}
          {!loading && !failed && trigger.query.trim().length >= 2 && results.length === 0 && <p className="px-2 py-2 text-caption text-ink-soft">검색된 레시피가 없어요.</p>}
          {!loading && results.map((recipe, index) =>
            <button
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              key={recipe.id}
              className={cn("flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-label", index === activeIndex ? "bg-paper-tint" : "hover:bg-paper-tint")}
              onMouseDown={event => event.preventDefault()}
              onClick={() => insert(recipe)}
            >
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md">
                {recipe.image_urls?.[0] ? <Photo src={recipe.image_urls[0]} sizes="32px" /> : <ChefHat className="m-2 h-4 w-4" aria-hidden />}
              </span>
              <span className="min-w-0"><span className="block truncate">{recipe.title}</span><span className="block truncate text-caption text-ink-soft">{recipe.username}</span></span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
