#!/usr/bin/env node
// One-time owner-scoped provisioning for SPOONIE site-only editorial profiles.
// No scheduled runner, no social identities, no provider credentials in output.
// Supabase Auth admin must be called server-side; never expose secret keys to clients.
import {readFileSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const PROJECT='https://dtyiyzfftsewpckfkqmo.supabase.co';
const input=process.argv[2];
const apply=process.argv.includes('--apply');
const assert=(ok,code)=>{if(!ok)throw Error(code)};
assert(input&&existsSync(input),'EXACT_EDITORIAL_ROSTER_JSON_REQUIRED');
const roster=JSON.parse(readFileSync(input,'utf8'));
assert(Array.isArray(roster)&&roster.length===18,'EXACT_18_CURATORS_REQUIRED');
const codes=new Set(),names=new Set();
for(const c of roster){
 assert(/^[a-z]{3,12}$/.test(c.code)&&!codes.has(c.code),'CURATOR_CODE_INVALID_OR_DUPLICATE');codes.add(c.code);
 assert(typeof c.name==='string'&&c.name.trim().length>=1&&!names.has(c.name),'CURATOR_NAME_INVALID_OR_DUPLICATE');names.add(c.name);
 assert(c.profileMessage?.startsWith('Spoonie 레시피 큐레이터 · ')&&c.profileMessage.length<240,'CURATOR_BRAND_AFFILIATION_REQUIRED');
}
for(const line of readFileSync('.env.local','utf8').split(/\r?\n/)){
 const match=line.match(/^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SECRET_KEY)=(.*)$/);
 if(match&&!process.env[match[1]])process.env[match[1]]=match[2].trim().replace(/^(['"])(.*)\1$/,'$2');
}
assert(process.env.NEXT_PUBLIC_SUPABASE_URL===PROJECT,'WRONG_SUPABASE_PROJECT_NO_WRITE');
assert(typeof process.env.SUPABASE_SECRET_KEY==='string'&&process.env.SUPABASE_SECRET_KEY.length>=24,'SERVER_SECRET_UNAVAILABLE');
const client=createClient(PROJECT,process.env.SUPABASE_SECRET_KEY,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
const users=[];
for(let page=1;page<5;page++){
 const {data,error}=await client.auth.admin.listUsers({page,perPage:1000});
 assert(!error,'ADMIN_READBACK_AUTH_LIST_FAILED_'+(error?.code||''));
 users.push(...data.users);
 if(data.users.length<1000)break;
 assert(page<4,'AUTH_PAGINATION_LIMIT_NO_WRITE');
}
const usernames=roster.map(c=>'spoonie_'+c.code);
const {data:profiles,error:pe}=await client.from('profiles').select('id,username,public_id').in('username',usernames);
assert(!pe,'PROFILES_PREFLIGHT_FAILED');
const existingByEmail=new Map(users.map(u=>[u.email?.toLowerCase(),u]));
for(const c of roster){
 const email=('curator+'+c.code+'@spoonie.kr').toLowerCase(),username='spoonie_'+c.code;
 const existing=existingByEmail.get(email);
 assert(!existing||existing.app_metadata?.spoonie_editorial_curator===true&&existing.app_metadata?.spoonie_curator_code===c.code,'EXISTING_AUTH_ACCOUNT_NOT_SPOONIE_EDITORIAL_'+c.code);
 assert(!(profiles||[]).some(p=>p.username===username&&p.id!==existing?.id),'CURATOR_USERNAME_TAKEN_NO_WRITE_'+c.code);
}
if(!apply){
 console.log(JSON.stringify({schema:'SPOONIE_EDITORIAL_PROVISION_PREFLIGHT_V1',planned:roster.length,
  existingAuth:roster.filter(c=>existingByEmail.has('curator+'+c.code+'@spoonie.kr')).length,
  newNeeded:roster.filter(c=>!existingByEmail.has('curator+'+c.code+'@spoonie.kr')).length,
  conflicts:0,providerWrites:0,existingUsersCount:users.length,siteOnly:true},null,2));
 process.exit(0);
}
const bound=[];
for(const c of roster){
 const email='curator+'+c.code+'@spoonie.kr',username='spoonie_'+c.code;
 let u=existingByEmail.get(email);
 if(!u){
  // This action does not send a signup email. Password is never logged or persisted.
  const {data,error}=await client.auth.admin.createUser({email,password:randomBytes(48).toString('base64url'),email_confirm:true,
   app_metadata:{spoonie_editorial_curator:true,spoonie_curator_code:c.code},
   user_metadata:{display_name:c.name,editorial_brand:'Spoonie'}});
  assert(!error&&data.user?.id,'CURATOR_AUTH_CREATE_UNKNOWN_CHECK_BEFORE_RETRY_'+c.code+'_'+(error?.code||''));
  u=data.user;existingByEmail.set(email,u);
 }
 const {data:authCheck,error:ae}=await client.auth.admin.getUserById(u.id);
 assert(!ae&&authCheck.user?.app_metadata?.spoonie_editorial_curator===true&&authCheck.user?.app_metadata?.spoonie_curator_code===c.code,'AUTH_APP_METADATA_READBACK_FAILED_'+c.code);
 const {data:updated,error:ue}=await client.from('profiles').update({
  username,display_name:c.name,entity_type:'organization',profile_message:c.profileMessage,
  is_profile_public:true
 }).eq('id',u.id).select('id,public_id,username,display_name,entity_type,profile_message').single();
 assert(!ue&&updated?.id===u.id&&updated?.username===username&&updated?.display_name===c.name&&updated?.entity_type==='organization'&&updated?.profile_message===c.profileMessage&&/^[a-z0-9]{6,20}$/.test(updated.public_id),'CURATOR_PROFILE_WRITE_OR_READBACK_FAILED_'+c.code);
 bound.push({code:c.code,name:c.name,userId:u.id,publicId:updated.public_id,username:updated.username,status:'active'});
}
console.log(JSON.stringify({schema:'SPOONIE_EDITORIAL_PROVISION_NATIVE_VERIFIED_V1',count:bound.length,authAndProfilesVerified:true,
 siteOnly:true,editorialNotRealMemberAcquisition:true,providerWrites:roster.length,bindings:bound},null,2));
