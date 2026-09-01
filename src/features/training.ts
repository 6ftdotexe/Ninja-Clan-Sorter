import {requireSupabase,supabase,unwrapMaybe} from '../lib/supabase';
import type {EquipmentCatalogItem,EquipmentInventoryItem,EquipmentSlot,StatKey,TrainingProfile} from '../types';

export const EQUIPMENT_CATALOG:EquipmentCatalogItem[]=[
  {id:'chakra-blade',name:'Chakra Conductive Blade',slot:'weapon',price:350,description:'A balanced field blade designed to carry elemental chakra without overwhelming control.',bonuses:{ninjutsu:3,speed:2}},
  {id:'weighted-wraps',name:'Weighted Combat Wraps',slot:'armor',price:220,description:'Training-grade wraps that reinforce close-range conditioning and impact tolerance.',bonuses:{taijutsu:3,strength:2}},
  {id:'reinforced-vest',name:'Reinforced Shinobi Vest',slot:'armor',price:400,description:'Layered protection for long deployments and attrition-heavy missions.',bonuses:{stamina:4,strength:1}},
  {id:'sealing-scroll',name:'Field Sealing Scroll',slot:'tool',price:280,description:'A compact scroll kit for prepared techniques, storage seals, and controlled chakra release.',bonuses:{chakraControl:4,intelligence:1}},
  {id:'smoke-kit',name:'Concealment Kit',slot:'tool',price:120,description:'Smoke, wire, tags, and decoys for repositioning and adaptive field control.',bonuses:{adaptability:3,speed:1}},
  {id:'wire-launcher',name:'Wire Launcher',slot:'tool',price:180,description:'A compact traversal and capture tool for rapid vertical movement and restraint.',bonuses:{speed:3,adaptability:1}},
  {id:'sensor-band',name:'Sensor Headband',slot:'accessory',price:260,description:'A tuned sensor array that rewards disciplined observation and tactical processing.',bonuses:{intelligence:3,chakraControl:1}},
  {id:'medical-pouch',name:'Medical Field Pouch',slot:'accessory',price:240,description:'Emergency treatment tools for support-oriented shinobi and squad leaders.',bonuses:{chakraControl:2,leadership:2}},
];

const catalogById=new Map(EQUIPMENT_CATALOG.map(item=>[item.id,item]));
const asNumber=(value:unknown)=>Number.isFinite(Number(value))?Number(value):0;
const validStats:StatKey[]=['ninjutsu','taijutsu','genjutsu','intelligence','speed','strength','stamina','chakraControl','leadership','adaptability'];

function normalizeTraining(data:unknown,characterId:string):TrainingProfile{
  const row=(data&&typeof data==='object'?data:{}) as Record<string,unknown>;
  const raw=(row.bonuses&&typeof row.bonuses==='object'?row.bonuses:{}) as Record<string,unknown>;
  const bonuses:Partial<Record<StatKey,number>>={};
  for(const key of validStats){const value=Math.max(0,Math.min(15,asNumber(raw[key])));if(value)bonuses[key]=value}
  return {character_id:characterId,training_points:Math.max(0,asNumber(row.training_points)),ryo:Math.max(0,asNumber(row.ryo)),bonuses,total_bonus:Object.values(bonuses).reduce((a,b)=>a+(b||0),0)};
}

export async function getTrainingProfile(characterId:string):Promise<TrainingProfile>{
  if(!supabase)return normalizeTraining(null,characterId);
  return normalizeTraining(unwrapMaybe<unknown>(await supabase.rpc('get_shinobi_training',{p_character_id:characterId})),characterId);
}

export async function trainStat(characterId:string,stat:StatKey,sessions=1){
  const db=requireSupabase();
  return normalizeTraining(unwrapMaybe<unknown>(await db.rpc('train_shinobi_stat',{p_character_id:characterId,p_stat:stat,p_sessions:sessions})),characterId);
}

export async function trainJutsuMastery(jutsuId:string,sessions=1){
  const db=requireSupabase();
  const data=unwrapMaybe<unknown>(await db.rpc('train_jutsu_mastery',{p_jutsu_id:jutsuId,p_sessions:sessions}));
  const row=(data&&typeof data==='object'?data:{}) as Record<string,unknown>;
  return {masteryXp:asNumber(row.mastery_xp),masteryLevel:Math.max(1,Math.min(5,asNumber(row.mastery_level)||1)),trainingPoints:Math.max(0,asNumber(row.training_points))};
}

export async function listEquipment(characterId:string):Promise<EquipmentInventoryItem[]>{
  if(!supabase)return[];
  const data=unwrapMaybe<unknown>(await supabase.rpc('list_shinobi_equipment',{p_character_id:characterId}));
  const rows=Array.isArray(data)?data:[];
  return rows.flatMap(raw=>{const row=raw as Record<string,unknown>;const item=catalogById.get(String(row.item_id||''));if(!item)return[];return [{id:String(row.id),character_id:characterId,user_id:String(row.user_id||''),item_id:item.id,slot:item.slot,equipped:Boolean(row.equipped),acquired_at:String(row.acquired_at||''),item}]});
}

export async function purchaseEquipment(characterId:string,itemId:string){
  const db=requireSupabase();
  return unwrapMaybe<unknown>(await db.rpc('purchase_shinobi_equipment',{p_character_id:characterId,p_item_id:itemId}));
}

export async function equipEquipment(characterId:string,inventoryId:string,equipped=true){
  const db=requireSupabase();
  return unwrapMaybe<unknown>(await db.rpc('equip_shinobi_equipment',{p_character_id:characterId,p_inventory_id:inventoryId,p_equipped:equipped}));
}

export function equipmentBonuses(items:EquipmentInventoryItem[]){
  const total:Partial<Record<StatKey,number>>={};
  for(const entry of items.filter(item=>item.equipped))for(const [key,value] of Object.entries(entry.item.bonuses) as [StatKey,number][])total[key]=(total[key]||0)+value;
  return total;
}

export function equipmentSlotLabel(slot:EquipmentSlot){return slot[0].toUpperCase()+slot.slice(1)}
