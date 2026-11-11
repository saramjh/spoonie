#!/usr/bin/env node
// Optional Spoonie editor action after a native, source-verified recipe exists.
// Safe by default: a read-only preflight unless --apply is given.
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const [file, ...flags] = process.argv.slice(2)
if (!file || !existsSync(file)) throw new Error('POLL_JSON_FILE_REQUIRED')
const payload = JSON.parse(readFileSync(file, 'utf8'))
const fail = (what) => { throw new Error(what) }
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i
if (!uuid.test(payload.recipeId)) fail('POLL_RECIPE_UUID_INVALID')
if (typeof payload.question !== 'string' || payload.question.trim().length < 8 || payload.question.length > 160)
  fail('POLL_QUESTION_REQUIRED')
if (!Array.isArray(payload.options) || payload.options.length < 2 || payload.options.length > 4 ||
    payload.options.some(v => typeof v !== 'string' || v.trim().length < 2 || v.length > 80) ||
    new Set(payload.options.map(v => v.trim().toLowerCase())).size !== payload.options.length)
  fail('POLL_OPTIONS_MUST_BE_DISTINCT_TWO_TO_FOUR')

for (const line of readFileSync('.env.local','utf8').split(/\r?\n/)) {
  const m = line.match(/^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SECRET_KEY)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2')
}
if (process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://dtyiyzfftsewpckfkqmo.supabase.co')
  fail('WRONG_PROJECT_NO_SEND')
if (!process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY.length < 24)
  fail('SERVER_SECRET_REQUIRED')
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY, {
  auth:{ autoRefreshToken:false,persistSession:false,detectSessionInUrl:false },
})
const {data:item,error:itemError} = await client.from('items').select('id,item_type,is_public,user_id,title').eq('id',payload.recipeId).maybeSingle()
if (itemError || item?.item_type !== 'recipe' || item?.is_public !== true) fail('POLL_ONLY_FOR_EXISTING_PUBLIC_RECIPE')
const {data:author,error:authError} = await client.auth.admin.getUserById(item.user_id)
if (authError || author.user?.app_metadata?.spoonie_editorial_curator !== true)
  fail('POLL_CURATOR_EDITORIAL_AUTHOR_REQUIRED')
const {data:existing,error:readError} = await client.from('recipe_polls').select('question,options,active').eq('recipe_id',payload.recipeId).maybeSingle()
if(readError) fail('POLL_PREFLIGHT_READ_FAILED')
const desired = {recipe_id:payload.recipeId,question:payload.question.trim(),options:payload.options.map(x=>x.trim()),active:true}
if(existing){
  if(existing.question!==desired.question || JSON.stringify(existing.options)!==JSON.stringify(desired.options))
    fail('EXISTING_POLL_DIFFERENT_DO_NOT_CHANGE_VOTES')
  console.log(JSON.stringify({status:'ALREADY_EXISTS_VERIFIED',recipeId:payload.recipeId,recipeTitle:item.title,providerWrites:0}))
  process.exit(0)
}
if(!flags.includes('--apply')){
  console.log(JSON.stringify({status:'PREFLIGHT_ONLY',recipeId:payload.recipeId,recipeTitle:item.title,options:desired.options.length,providerWrites:0}))
  process.exit(0)
}
const {error:writeError}=await client.from('recipe_polls').insert(desired)
if(writeError) fail('POLL_INSERT_FAILED_CHECK_BEFORE_RETRY_'+(writeError.code||'UNKNOWN'))
const {data:verified,error:verifyError}=await client.from('recipe_polls').select('question,options,active').eq('recipe_id',payload.recipeId).single()
if(verifyError || verified.question!==desired.question ||
    JSON.stringify(verified.options)!==JSON.stringify(desired.options) || verified.active!==true)
  fail('POLL_PROVIDER_READBACK_FAILED_NO_RETRY')
console.log(JSON.stringify({status:'NATIVE_POLL_CONFIG_VERIFIED',recipeId:payload.recipeId,question:desired.question,options:desired.options.length,providerWrites:1}))
