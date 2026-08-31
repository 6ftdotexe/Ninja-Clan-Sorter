import type{TestResult,GeneratorOptions,GeneratorRequest,GeneratorResponse}from '../types';
import{tests}from '../data/quizzes';
import {supabase} from '../lib/supabase';



type Results=Partial<Record<'clan'|'village'|'mentor'|'rogue'|'chakra'|'summon',TestResult>>;

export const GENERATOR_MODES = [
  { id: 'portrait', label: 'Portrait', desc: 'Face-first cinematic character art' },
  { id: 'full-body', label: 'Full Body', desc: 'Complete outfit and shinobi silhouette' },
  { id: 'action', label: 'Action Scene', desc: 'Wide cinematic chakra + environment' },
  { id: 'dossier', label: 'Dossier', desc: 'Vertical profile-card artwork' },
] as const;

export const GENERATION_PACKS = [
  { id: 'single', credits: 1, price: '$1.99' },
  { id: 'triple', credits: 3, price: '$4.99', tag: 'Popular' },
  { id: 'ten', credits: 10, price: '$12.99', tag: 'Best value' },
] as const;

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  mode: 'full-body',
  quality: 'medium',
  preserveHair: true,
  showSummon: true,
  showDojutsu: true,
};

export type GenerationPackId = (typeof GENERATION_PACKS)[number]['id'];

export function generationCost(options: GeneratorOptions) {
  return options.quality === 'high' ? 2 : 1;
}

export function generatorDownloadName(name: string) {
  const safeName = (name || 'shinobi').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  return `${safeName}-shinobi.png`;
}

export function validateReferenceImage(file: File) {
  if (!file.type.startsWith('image/')) return 'Choose a JPG, PNG, WEBP or other image file.';
  if (file.size > 10 * 1024 * 1024) return 'Use a photo under 10 MB.';
  return '';
}

const label=(test:'clan'|'village'|'mentor'|'rogue'|'chakra'|'summon',id?:string)=>id?(tests[test].outcomes[id]?.label||id):'Unresolved';

const mentorInfluence:Record<string,string>={
 Kakashi:'calm analytical mentorship, understated competence, adaptive tactics, independent judgment, and precision under pressure',
 'Might Guy':'relentless drive, visible effort, physical confidence, optimism, and explosive determination',
 Tsunade:'demanding standards, practical competence, resilience, decisive action, and disciplined precision',
 Jiraiya:'field-tested versatility, improvisation, curiosity, unconventional problem solving, and worldly confidence',
 Yamato:'stability, control, teamwork, restraint, structure, and dependable command presence',
 Orochimaru:'intellectual curiosity, experimentation, unconventional technique design, eerie composure, and relentless pursuit of mastery'
};

const shadowInfluence:Record<string,string>={
 Itachi:'restrained intensity, long-range planning, emotional control, sacrifice, quiet burden, and unnerving precision',
 Pain:'ideological certainty, imposing presence, strategic control, gravitas, and overwhelming purpose',
 Konan:'quiet discipline, loyalty, preparation, elegant precision, and unwavering commitment',
 Deidara:'creative aggression, dramatic confidence, unpredictability, expressive combat instincts, and high-impact execution',
 Sasori:'control, patience, technical exactness, emotional restraint, and an obsession with permanence',
 Kisame:'raw endurance, blunt confidence, intimidating calm, relentless pressure, and dark humor',
 Obito:'masked vulnerability, adaptive manipulation, emotional intensity, tactical deception, and reality-bending ambition'
};

export function buildShinobiPrompt(name:string,results:Results,options:GeneratorOptions){
 const clan=results.clan;const chakra=results.chakra;
 const mentorId=results.mentor?.winner||'';
 const rogueId=results.rogue?.winner||'';
 const profile={
  name:name||'the shinobi',
  clan:label('clan',clan?.winner),
  village:label('village',results.village?.winner),
  rank:String(clan?.meta?.rank||'Jōnin'),
  role:String(clan?.meta?.role||'Tactician'),
  primary:label('chakra',chakra?.winner),
  secondary:chakra?.secondary?label('chakra',chakra.secondary):'None',
  advanced:chakra?.advanced||'None',
  summon:label('summon',results.summon?.winner),
  mentorInfluence:mentorInfluence[mentorId]||'adaptive mentorship, tactical discipline, and steady growth',
  shadowInfluence:shadowInfluence[rogueId]||'controlled intensity, strategic restraint, and psychological depth',
  leadership:String(clan?.meta?.leadership||clan?.meta?.leader||'Adaptive'),
  trait:String(clan?.meta?.trait||clan?.meta?.inheritedTrait||'Clan aptitude'),
  specialty:String(clan?.meta?.specialty||tests.clan.outcomes[clan?.winner||'']?.specialty||'Precision ninjutsu')
 };
 const composition={portrait:'waist-up character portrait, face dominant, clean cinematic background','full-body':'full-body standing character design, entire outfit and silhouette visible',action:'dynamic full-body combat scene with controlled motion and readable face',dossier:'clean vertical character dossier portrait with restrained background effects and clear silhouette'}[options.mode];
 return `Transform the person in the supplied reference photo into an original anime shinobi character while preserving recognizable facial identity, face shape, skin tone, eye shape, and ${options.preserveHair?'their recognizable hairstyle/hair texture':'a believable hairstyle derived from the reference'}. The result must remain an original character based on the real person. Do not imitate, recreate, or closely resemble any named canon character's face, hairstyle, clothing, pose, accessories, or exact costume design.\n\nSHINOBI IDENTITY\nName: ${profile.name}\nBloodline / clan affinity: ${profile.clan}\nVillage affiliation: ${profile.village}\nProjected rank: ${profile.rank}\nCombat role: ${profile.role}\nPrimary chakra nature: ${profile.primary}\nSecondary chakra nature: ${profile.secondary}\nAdvanced release: ${profile.advanced}\nSummoning contract: ${profile.summon}\nMentorship influence: ${profile.mentorInfluence}\nShadow temperament: ${profile.shadowInfluence}\nLeadership style: ${profile.leadership}\nInherited trait: ${profile.trait}\nSpecialization: ${profile.specialty}\n\nVISUAL DIRECTION\n${composition}. Create completely original shinobi clothing that blends the village environment, clan temperament, rank, and combat specialization without duplicating recognizable canon costumes. Communicate ${profile.primary} and ${profile.secondary} chakra through elegant, physically coherent effects. ${options.showSummon?`Include a ${profile.summon} summoning companion in a supporting position without obscuring the person.`:'Do not include a summon in the scene.'} ${options.showDojutsu&&profile.clan.toLowerCase().includes('uchiha')?'Show a subtle red inherited dojutsu effect with a newly invented iris pattern rather than a recognizable canon eye design.':'Keep the eyes natural unless the inherited trait calls for a subtle supernatural detail.'} Convey ${profile.role} capability, ${profile.leadership} presence, ${profile.specialty}, and the mentorship/shadow traits above only through original posture, expression, equipment choices, and atmosphere. Keep weapons and effects secondary to the person's likeness. Dramatic professional anime key art, crisp facial rendering, detailed fabrics, cinematic light, atmospheric depth, no text, no logos, no UI, no watermark.`;
}


export async function optimizeReferenceImage(file: File, maxSide = 1536): Promise<string> {
  const objectUrl=URL.createObjectURL(file);
  try{
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Could not load the image for optimization.'));
      element.src = objectUrl;
    });
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable in this browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Could not compress the reference image.')),'image/jpeg',0.9));
    return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Could not encode the optimized image.'));reader.onload=()=>resolve(String(reader.result));reader.readAsDataURL(blob)});
  }finally{URL.revokeObjectURL(objectUrl)}
}

const API_TIMEOUT_MS=45_000;
const GENERATION_TIMEOUT_MS=165_000;
const IDB_TIMEOUT_MS=8_000;

async function authHeaders(): Promise<Record<string, string>> {
  if(!supabase)return {};
  const {data,error}=await supabase.auth.getSession();
  if(error)throw new Error('Could not verify your current session. Please sign in again.');
  const token=data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function timeoutSignal(ms:number){
  return typeof AbortSignal!=='undefined' && 'timeout' in AbortSignal
    ? AbortSignal.timeout(ms)
    : undefined;
}

async function apiJson<T>(url: string, init: RequestInit = {}, fallback = 'Request failed.', timeoutMs=API_TIMEOUT_MS): Promise<T> {
  let response:Response;
  try{
    response=await fetch(url, {
      ...init,
      signal:init.signal??timeoutSignal(timeoutMs),
      headers: {...(init.body ? {'Content-Type':'application/json'} : {}), ...(await authHeaders()), ...(init.headers ?? {})},
    });
  }catch(error){
    if(error instanceof DOMException && error.name==='TimeoutError')throw new Error('The request timed out. Please try again.');
    throw error;
  }
  const text=await response.text();
  let data:Record<string,unknown>={};
  if(text){
    try{data=JSON.parse(text) as Record<string,unknown>}
    catch{if(response.ok)throw new Error(`${fallback}: server returned an invalid response.`)}
  }
  if (!response.ok) {
    const requestId=response.headers.get('x-request-id')||'';
    const message=typeof data.error==='string' ? data.error : `${fallback} (${response.status})`;
    throw new Error(requestId ? `${message} [Ref: ${requestId}]` : message);
  }
  return data as T;
}

export function generateShinobiImage(payload: GeneratorRequest) {
  return apiJson<GeneratorResponse>('/api/generate-shinobi', {method:'POST', body:JSON.stringify(payload)}, 'Generation failed', GENERATION_TIMEOUT_MS);
}

export async function getGenerationCredits() {
  const data = await apiJson<{credits?:number}>('/api/credits', {}, 'Could not load generation credits');
  const credits=Number(data.credits);
  return Number.isFinite(credits)&&credits>=0?Math.floor(credits):0;
}

export async function createGenerationCheckout(packId: 'single' | 'triple' | 'ten') {
  const data = await apiJson<{url?:string}>('/api/create-checkout', {method:'POST', body:JSON.stringify({packId})}, 'Could not start checkout');
  if (!data.url || typeof data.url!=='string') throw new Error('Checkout response did not include a URL.');
  let checkout:URL;
  try{checkout=new URL(data.url)}catch{throw new Error('Checkout response included an invalid URL.')}
  if(checkout.protocol!=='https:' || !(checkout.hostname==='stripe.com' || checkout.hostname.endsWith('.stripe.com')))throw new Error('Checkout response included an unexpected destination.');
  return checkout.toString();
}

const DB='shinobi-v8-media';const STORE='portraits';const KEY='active';
function idbAvailable(){return typeof indexedDB!=='undefined'}
function withTimeout<T>(promise:Promise<T>,ms=IDB_TIMEOUT_MS,message='Local portrait storage timed out.'){return Promise.race([promise,new Promise<T>((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))])}
function openDb(){
  if(!idbAvailable())return Promise.reject(new Error('Portrait storage is unavailable in this browser.'));
  return withTimeout(new Promise<IDBDatabase>((resolve,reject)=>{
    const r=indexedDB.open(DB,1);
    r.onblocked=()=>reject(new Error('Portrait storage is blocked by another open tab. Close other archive tabs and try again.'));
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};
    r.onsuccess=()=>resolve(r.result);
    r.onerror=()=>reject(r.error??new Error('Could not open portrait storage.'));
  }));
}
async function portraitTransaction<T>(mode:IDBTransactionMode,work:(store:IDBObjectStore,resolve:(value:T)=>void,reject:(reason?:unknown)=>void)=>void){
  const db=await openDb();
  try{
    return await withTimeout(new Promise<T>((resolve,reject)=>{
      const tx=db.transaction(STORE,mode);
      tx.onabort=()=>reject(tx.error??new Error('Portrait storage transaction was aborted.'));
      tx.onerror=()=>reject(tx.error??new Error('Portrait storage transaction failed.'));
      work(tx.objectStore(STORE),resolve,reject);
    }));
  }finally{db.close()}
}
export async function saveActivePortrait(dataUrl:string){
  if(!dataUrl.startsWith('data:image/'))throw new Error('Generated portrait data is invalid.');
  await portraitTransaction<void>('readwrite',(store,resolve,reject)=>{const r=store.put(dataUrl,KEY);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)});
}
export async function loadActivePortrait(){return portraitTransaction<string|undefined>('readonly',(store,resolve,reject)=>{const r=store.get(KEY);r.onsuccess=()=>resolve(typeof r.result==='string'?r.result:undefined);r.onerror=()=>reject(r.error)})}
export async function clearActivePortrait(){await portraitTransaction<void>('readwrite',(store,resolve,reject)=>{const r=store.delete(KEY);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}

export type IntegrityIssue={code:string;message:string;repaired:boolean;count?:number};
export type IntegrityReport={ok:boolean;repaired:boolean;checkedAt:string;wallet:{credits:number;ledgerFloor:number;difference:number};summary:{characters:number;generations:number;missions:number};issues:IntegrityIssue[]};
export function runAccountIntegrityCheck(repair=true){return apiJson<IntegrityReport>('/api/account-integrity',repair?{method:'POST'}:{},'Could not check account data integrity',60_000)}
