import type { Response } from 'express';
import { type AuthedRequest, getCredits, grantCredits, requireAdmin } from './config.js';
import { logEvent, observe, recordError } from './diagnostics.js';

type CharacterRow={id:string;name:string;is_active:boolean;is_public:boolean;public_slug:string|null;updated_at:string};
type GenerationRow={id:string;status:'processing'|'completed'|'failed';credits_used:number;created_at:string;completed_at:string|null;error_message:string|null};
type PaymentRow={credits:number;status:string};
type MissionRow={id:string;status:string;accepted_at:string|null;completed_at:string|null;created_at:string;outcome:string|null};

export type IntegrityIssue={code:string;message:string;repaired:boolean;count?:number};
export type IntegrityReport={ok:boolean;repaired:boolean;checkedAt:string;wallet:{credits:number;ledgerFloor:number;difference:number};summary:{characters:number;generations:number;missions:number};issues:IntegrityIssue[]};

const STALE_GENERATION_MS=12*60*1000;
const terminalMissionStatus=new Set(['completed','failed','abandoned']);
const safeInt=(value:unknown)=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
const ageMs=(iso:string)=>Date.now()-new Date(iso).getTime();

async function normalizeCharacters(userId:string,repair:boolean,issues:IntegrityIssue[]){
  const db=requireAdmin();
  const {data,error}=await db.from('shinobi_characters').select('id,name,is_active,is_public,public_slug,updated_at').eq('user_id',userId).order('updated_at',{ascending:false});
  if(error)throw error;
  const rows=(data??[]) as CharacterRow[];
  const active=rows.filter(row=>row.is_active);
  if(rows.length&&active.length!==1){
    const keep=(active[0]??rows[0])?.id;
    if(repair&&keep){
      const {error:clearError}=await db.from('shinobi_characters').update({is_active:false}).eq('user_id',userId).neq('id',keep);
      if(clearError)throw clearError;
      const {error:setError}=await db.from('shinobi_characters').update({is_active:true}).eq('user_id',userId).eq('id',keep);
      if(setError)throw setError;
    }
    issues.push({code:'ACTIVE_CHARACTER_COUNT',message:`Expected one active shinobi but found ${active.length}.`,repaired:repair,count:active.length});
  }

  const badNames=rows.filter(row=>!row.name?.trim());
  if(badNames.length){
    if(repair){
      const ids=badNames.map(row=>row.id);
      const {error:updateError}=await db.from('shinobi_characters').update({name:'Unnamed Shinobi'}).in('id',ids).eq('user_id',userId);
      if(updateError)throw updateError;
    }
    issues.push({code:'EMPTY_CHARACTER_NAMES',message:`Found ${badNames.length} shinobi with an empty name.`,repaired:repair,count:badNames.length});
  }

  const missingSlugs=rows.filter(row=>row.is_public&&!row.public_slug);
  if(missingSlugs.length){
    if(repair){
      for(const row of missingSlugs){
        const base=(row.name||'shinobi').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,42)||'shinobi';
        const slug=`${base}-${row.id.replace(/-/g,'').slice(0,8)}`;
        const {error:updateError}=await db.from('shinobi_characters').update({public_slug:slug}).eq('id',row.id).eq('user_id',userId);
        if(updateError)throw updateError;
      }
    }
    issues.push({code:'PUBLIC_SLUG_MISSING',message:`Found ${missingSlugs.length} public shinobi without a share slug.`,repaired:repair,count:missingSlugs.length});
  }
  return rows.length;
}

async function repairChildOwnership(userId:string,characterIds:string[],repair:boolean,issues:IntegrityIssue[]){
  if(!characterIds.length)return;
  const db=requireAdmin();
  const tables=['character_test_results','jutsu_techniques','shinobi_progression','shinobi_missions','character_lore','character_timeline_events'] as const;
  for(const table of tables){
    const relation=db.from(table);
    const first=await relation.select('id,character_id,user_id').in('character_id',characterIds).limit(5000);
    // progression/lore use character_id as a primary key and do not expose a separate id.
    let rows=first.data as Array<{id?:string;character_id:string;user_id:string}>|null;
    if(first.error){
      const retry=await db.from(table).select('character_id,user_id').in('character_id',characterIds).limit(5000);
      if(retry.error)throw retry.error;
      rows=retry.data as Array<{character_id:string;user_id:string}>|null;
    }
    if(!rows?.length)continue;
    const mismatched=rows.filter(row=>row.user_id!==userId);
    if(!mismatched.length)continue;
    if(repair){
      for(const row of mismatched){
        const query=db.from(table).update({user_id:userId});
        const result=row.id?await query.eq('id',row.id):await query.eq('character_id',row.character_id);
        if(result.error)throw result.error;
      }
    }
    issues.push({code:`OWNER_MISMATCH_${table.toUpperCase()}`,message:`Found ${mismatched.length} ${table} row(s) with mismatched ownership.`,repaired:repair,count:mismatched.length});
  }
}

async function normalizeMissions(userId:string,repair:boolean,issues:IntegrityIssue[]){
  const db=requireAdmin();
  const {data,error}=await db.from('shinobi_missions').select('id,status,accepted_at,completed_at,created_at,outcome').eq('user_id',userId).order('created_at',{ascending:false}).limit(5000);
  if(error)throw error;
  const rows=(data??[]) as MissionRow[];
  const missingAccepted=rows.filter(row=>row.status!=='offered'&&!row.accepted_at);
  const terminalMissingCompleted=rows.filter(row=>terminalMissionStatus.has(row.status)&&!row.completed_at);
  const openWithCompleted=rows.filter(row=>(row.status==='accepted'||row.status==='offered')&&row.completed_at);
  if(repair){
    for(const row of missingAccepted){const r=await db.from('shinobi_missions').update({accepted_at:row.created_at}).eq('id',row.id).eq('user_id',userId);if(r.error)throw r.error;}
    for(const row of terminalMissingCompleted){const r=await db.from('shinobi_missions').update({completed_at:row.accepted_at||row.created_at}).eq('id',row.id).eq('user_id',userId);if(r.error)throw r.error;}
    for(const row of openWithCompleted){const r=await db.from('shinobi_missions').update({completed_at:null,...(row.status==='offered'?{accepted_at:null,outcome:null}:{})}).eq('id',row.id).eq('user_id',userId);if(r.error)throw r.error;}
  }
  if(missingAccepted.length)issues.push({code:'MISSION_ACCEPTED_AT_MISSING',message:`Found ${missingAccepted.length} mission(s) missing an acceptance timestamp.`,repaired:repair,count:missingAccepted.length});
  if(terminalMissingCompleted.length)issues.push({code:'MISSION_COMPLETED_AT_MISSING',message:`Found ${terminalMissingCompleted.length} finished mission(s) missing a completion timestamp.`,repaired:repair,count:terminalMissingCompleted.length});
  if(openWithCompleted.length)issues.push({code:'MISSION_OPEN_WITH_COMPLETION',message:`Found ${openWithCompleted.length} open mission(s) with a completion timestamp.`,repaired:repair,count:openWithCompleted.length});
  return rows.length;
}

async function reconcileGenerationLedger(userId:string,repair:boolean,issues:IntegrityIssue[]){
  const db=requireAdmin();
  const [paymentsResult,generationsResult]=await Promise.all([
    db.from('generation_payments').select('credits,status').eq('user_id',userId),
    db.from('generations').select('id,status,credits_used,created_at,completed_at,error_message').eq('user_id',userId).order('created_at',{ascending:false}).limit(5000),
  ]);
  if(paymentsResult.error)throw paymentsResult.error;
  if(generationsResult.error)throw generationsResult.error;
  const payments=(paymentsResult.data??[]) as PaymentRow[];
  const generations=(generationsResult.data??[]) as GenerationRow[];
  const stale=generations.filter(row=>row.status==='processing'&&ageMs(row.created_at)>STALE_GENERATION_MS);
  if(stale.length&&repair){
    for(const row of stale){
      const r=await db.from('generations').update({status:'failed',completed_at:new Date().toISOString(),error_message:'Recovered stale processing record during account self-check.'}).eq('id',row.id).eq('user_id',userId).eq('status','processing');
      if(r.error)throw r.error;
    }
  }
  if(stale.length)issues.push({code:'STALE_GENERATIONS',message:`Found ${stale.length} generation request(s) stuck in processing.`,repaired:repair,count:stale.length});

  const terminalMissingTime=generations.filter(row=>row.status!=='processing'&&!row.completed_at);
  if(terminalMissingTime.length&&repair){
    for(const row of terminalMissingTime){const r=await db.from('generations').update({completed_at:row.created_at}).eq('id',row.id).eq('user_id',userId);if(r.error)throw r.error;}
  }
  if(terminalMissingTime.length)issues.push({code:'GENERATION_COMPLETED_AT_MISSING',message:`Found ${terminalMissingTime.length} finished generation record(s) missing a completion timestamp.`,repaired:repair,count:terminalMissingTime.length});

  const paid=payments.filter(row=>row.status==='paid').reduce((sum,row)=>sum+safeInt(row.credits),0);
  const staleIds=new Set(stale.map(row=>row.id));
  const consumed=generations.filter(row=>row.status==='completed'||(row.status==='processing'&&!staleIds.has(row.id))).reduce((sum,row)=>sum+safeInt(row.credits_used),0);
  const ledgerFloor=Math.max(0,paid-consumed);
  let credits=await getCredits(userId);
  if(credits<ledgerFloor){
    const missing=ledgerFloor-credits;
    if(repair)credits=await grantCredits(userId,missing);
    issues.push({code:'WALLET_BELOW_LEDGER',message:`Wallet was ${missing} credit(s) below the recoverable payment/generation ledger.`,repaired:repair,count:missing});
  }else if(credits>ledgerFloor){
    issues.push({code:'WALLET_ABOVE_LEDGER',message:`Wallet is ${credits-ledgerFloor} credit(s) above the calculated ledger floor. No credits were removed.`,repaired:false,count:credits-ledgerFloor});
  }
  return {credits,ledgerFloor,difference:credits-ledgerFloor,generations:generations.length};
}

export async function auditAccountIntegrity(userId:string,repair=true):Promise<IntegrityReport>{
  const issues:IntegrityIssue[]=[];
  const db=requireAdmin();
  const characterRows=await db.from('shinobi_characters').select('id').eq('user_id',userId);
  if(characterRows.error)throw characterRows.error;
  const characterIds=(characterRows.data??[]).map(row=>String(row.id));
  const characters=await normalizeCharacters(userId,repair,issues);
  await repairChildOwnership(userId,characterIds,repair,issues);
  const missions=await normalizeMissions(userId,repair,issues);
  const ledger=await reconcileGenerationLedger(userId,repair,issues);
  return {ok:issues.every(issue=>issue.repaired||issue.code==='WALLET_ABOVE_LEDGER'),repaired:repair&&issues.some(issue=>issue.repaired),checkedAt:new Date().toISOString(),wallet:{credits:ledger.credits,ledgerFloor:ledger.ledgerFloor,difference:ledger.difference},summary:{characters,generations:ledger.generations,missions},issues};
}

export async function handleAccountIntegrity(req:AuthedRequest,res:Response){
  try{
    const repair=req.method==='POST';
    const report = await observe('integrity.audit', () => auditAccountIntegrity(req.authUser!.id,repair), 2000);
    logEvent('info', 'integrity_check_completed', { requestId: req.requestId, repair, issues: report.issues.length, repaired: report.repaired });
    return res.json(report);
  }catch(error){
    recordError(error, 'integrity_check_failed', { requestId: req.requestId });
    return res.status(500).json({error:'Could not complete account integrity check.'});
  }
}
