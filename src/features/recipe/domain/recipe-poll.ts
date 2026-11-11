import type { SupabaseClient } from '@supabase/supabase-js'

export interface RecipePollSnapshot {
  recipeId: string
  question: string
  options: string[]
  counts: number[]
  total: number
  selectedIndex: number | null
}

/** A poll is independent of recipe.description; malformed network data never renders a fake result. */
export function readRecipePollSnapshot(input: unknown): RecipePollSnapshot | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const v = input as Record<string, unknown>
  if (typeof v.recipe_id !== 'string' ||
      typeof v.question !== 'string' || !v.question.trim() ||
      !Array.isArray(v.options) || v.options.length < 2 || v.options.length > 4 ||
      v.options.some(o => typeof o !== 'string' || !o.trim() || o.length > 80) ||
      new Set(v.options.map((o: string) => o.trim().toLowerCase())).size !== v.options.length ||
      !Array.isArray(v.counts) || v.counts.length !== v.options.length ||
      v.counts.some(n => !Number.isSafeInteger(n) || n < 0) ||
      !Number.isSafeInteger(v.total) || (v.total as number) < 0 ||
      (v.counts as number[]).reduce((a,b) => a + b,0) !== v.total ||
      (v.selected_index !== null &&
        (!Number.isInteger(v.selected_index) || (v.selected_index as number) < 0 || (v.selected_index as number) >= v.options.length))) return null
  return {
    recipeId: v.recipe_id,
    question: v.question.trim(),
    options: [...v.options],
    counts: [...v.counts],
    total: v.total as number,
    selectedIndex: v.selected_index as number | null,
  }
}

export function splitEditorialPollPrompt(text: string): { body: string; prompt: string | null } {
  // Backwards compatibility: remove only the standalone, explicitly marked invitation,
  // and only if the same recipe actually has a structured poll.
  const expression = /(?:^|\n)함께 나눠요\s*\|\s*([^\n]{1,180})(?=\n|$)/u
  const match = expression.exec(text)
  if (!match) return { body: text, prompt: null }
  const before = text.slice(0,match.index).trimEnd()
  const after = text.slice(match.index + match[0].length).trimStart()
  return { body: [before,after].filter(Boolean).join('\n\n'), prompt: match[1].trim() }
}

export async function fetchRecipePoll(supabase: SupabaseClient, recipeId: string): Promise<RecipePollSnapshot | null> {
  const { data,error } = await supabase.rpc('get_recipe_poll', { p_recipe_id: recipeId })
  if (error) throw error
  if (data === null) return null
  const poll = readRecipePollSnapshot(data)
  if (!poll || poll.recipeId !== recipeId) throw new Error('POLL_RESPONSE_INVALID')
  return poll
}

export async function castRecipePollVote(supabase: SupabaseClient, recipeId: string, optionIndex: number): Promise<RecipePollSnapshot> {
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 3) throw new Error('POLL_INVALID_CHOICE')
  const {data,error} = await supabase.rpc('cast_recipe_poll_vote',{p_recipe_id:recipeId,p_option_index:optionIndex})
  if (error) throw error
  const poll = readRecipePollSnapshot(data)
  if (!poll || poll.recipeId !== recipeId || poll.selectedIndex !== optionIndex) throw new Error('POLL_SAVE_UNVERIFIED')
  return poll
}
