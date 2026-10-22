import { createClient } from 'npm:@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const respond=(obj:unknown,status=200)=>new Response(JSON.stringify(obj),{status,headers:{...cors,'Content-Type':'application/json'}});
const enc=new TextEncoder();
async function hash(code:string){const pepper=Deno.env.get('CODE_PEPPER');if(!pepper)throw Error('Missing CODE_PEPPER secret');const digest=await crypto.subtle.digest('SHA-256',enc.encode(pepper+'|'+code.trim().toUpperCase()));return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')}
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response(null,{headers:cors});if(req.method!=='POST')return respond({error:'Method not allowed'},405);try{
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const root=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
 const body=await req.json(),action=String(body.action||'');
 if(action==='save'){
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return respond({error:'Sign in required'},401);
  const {data:{user},error:authError}=await root.auth.getUser(token);if(authError||!user)return respond({error:'Invalid login'},401);
  const {data:admin}=await root.from('admins').select('user_id').eq('user_id',user.id).maybeSingle();if(!admin)return respond({error:'Not authorized'},403);
  const r=body.record||{},code=String(body.code||'').trim().toUpperCase();if(!/^[A-Z0-9-]{6,48}$/.test(code))return respond({error:'Invalid code'},400);
  if(!r.title||!r.start_at||!r.end_at||new Date(r.end_at)<=new Date(r.start_at))return respond({error:'Invalid event details'},400);
  const allowed=['title','category','start_at','end_at','location','address','people','payment_note','notes'];const record:Object=Object.fromEntries(allowed.map(k=>[k,r[k]??null]));
  const code_hash=await hash(code);
  if(body.id){const {data:existing}=await root.from('shoots').select('version').eq('id',body.id).maybeSingle();if(!existing)return respond({error:'Event not found'},404);const {error}=await root.from('shoots').update({...record,code_hash,status:'pending',confirmed_at:null,version:existing.version+1,updated_at:new Date().toISOString()}).eq('id',body.id);if(error)return respond({error:error.code==='23505'?'Code already in use':error.message},400);return respond({ok:true})}
  const {error}=await root.from('shoots').insert({...record,code_hash,status:'pending'});if(error)return respond({error:error.code==='23505'?'Code already in use':error.message},400);return respond({ok:true});
 }
 const code=String(body.code||'').trim().toUpperCase();if(!/^[A-Z0-9-]{6,48}$/.test(code))return respond({error:'Invalid code'},400);
 const {data:event}=await root.from('shoots').select('id,title,category,start_at,end_at,location,address,people,payment_note,notes,status,version').eq('code_hash',await hash(code)).maybeSingle();if(!event||event.status==='cancelled')return respond({error:'No active plan found'},404);
 if(action==='lookup'){const {data:feedback}=await root.from('shoot_feedback').select('message,created_at').eq('shoot_id',event.id).order('created_at',{ascending:true}).limit(100);return respond({event,feedback:feedback||[]})}
 if(action==='feedback'){const message=String(body.message||'').trim();if(!message||message.length>3000)return respond({error:'Message must be 1–3000 characters'},400);const {error}=await root.from('shoot_feedback').insert({shoot_id:event.id,message});return error?respond({error:'Could not save message'},400):respond({ok:true})}
 if(action==='confirm'){if(Number(body.version)!==event.version)return respond({error:'Plan changed; please refresh before confirming'},409);const {data,error}=await root.from('shoots').update({status:'confirmed',confirmed_at:new Date().toISOString()}).eq('id',event.id).eq('version',event.version).eq('status','pending').select('id').maybeSingle();return error?respond({error:'Could not confirm'},400):!data?respond({error:'Plan already changed or confirmed'},409):respond({ok:true})}
 return respond({error:'Unknown action'},400);
 }catch(e){console.error(e);return respond({error:'Request could not be completed'},500)}});
