import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
Deno.serve(async req=>{
 const secret=Deno.env.get("REMINDER_CRON_SECRET");
 if(!secret||req.method!=="POST"||req.headers.get("x-reminder-secret")!==secret)return new Response("Unauthorized",{status:401});
 const pub=Deno.env.get("VAPID_PUBLIC_KEY"),priv=Deno.env.get("VAPID_PRIVATE_KEY"),subject=Deno.env.get("VAPID_SUBJECT");
 if(!pub||!priv||!subject)return new Response("Not configured",{status:503});
 webpush.setVapidDetails(subject,pub,priv);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const date=(offset=0)=>new Date(Date.now()+9*3600000+offset*86400000).toISOString().slice(0,10);
 const today=date(), targets=new Set([today,date(1),date(3)]);
 const {data:plans,error}=await db.from("finance_reminders").select("user_id,revision,dates").limit(1000);
 if(error)return new Response("Database error",{status:500});
 let sent=0,failed=0;
 for(const p of plans??[]){
  if(!p.dates.some((d:string)=>targets.has(d)))continue;
  const {data:state,error:stateErr}=await db.from("finance_state").select("revision").eq("user_id",p.user_id).maybeSingle();
  if(stateErr||!state||state.revision!==p.revision)continue;
  const {data:subs,error:subErr}=await db.from("finance_push").select("endpoint,subscription").eq("user_id",p.user_id);
  if(subErr){failed++;continue;}
  for(const s of subs??[]){
   try{
    const url=new URL(s.endpoint);
    if(url.protocol!=="https:"||url.username||url.password||url.port||!["fcm.googleapis.com","updates.push.services.mozilla.com","web.push.apple.com","notify.windows.com"].some(h=>url.hostname===h||url.hostname.endsWith("."+h)))continue;
    if(s.subscription.endpoint!==s.endpoint)continue;
    const {error:claim}=await db.from("finance_push_sent").insert({user_id:p.user_id,endpoint:s.endpoint,send_date:today});
    if(claim){if(claim.code!=="23505")failed++;continue;}
    try{await webpush.sendNotification(s.subscription,"{}",{TTL:3600,timeout:10000});sent++}
    catch(e){failed++;const status=(e as {statusCode?:number}).statusCode;if(status===404||status===410)await db.from("finance_push").delete().eq("user_id",p.user_id).eq("endpoint",s.endpoint);else await db.from("finance_push_sent").delete().eq("user_id",p.user_id).eq("endpoint",s.endpoint).eq("send_date",today)}
   }catch{failed++}
  }
 }
 return Response.json({sent,failed});
});
