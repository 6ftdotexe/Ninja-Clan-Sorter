import type {CombatStats,NormalizedShinobiProfile,StatKey} from '../types/combat';
const keys:StatKey[]=['ninjutsu','taijutsu','genjutsu','intelligence','speed','strength','stamina','chakraControl','leadership','adaptability'];
const bump=(s:CombatStats,amount:number,...ks:StatKey[])=>ks.forEach(k=>s[k]+=amount);
const text=(p:NormalizedShinobiProfile)=>Object.values({clan:p.clan,village:p.village,chakra:p.primaryChakra,secondary:p.secondaryChakra,summon:p.summon,mentor:p.mentor,shadow:p.shadow,fighting:p.fightingStyle,weapon:p.weaponAffinity,lead:p.leadershipStyle,rank:p.rankPotential,inherited:p.inheritedPotential,specialty:p.specialty,role:p.teamRole}).join(' ').toLowerCase();
export function deriveCombatStats(p:NormalizedShinobiProfile):CombatStats{
 const s=Object.fromEntries(keys.map(k=>[k,52])) as CombatStats; const t=text(p);
 if(/precision|strateg|analyt|kakashi|control/.test(t))bump(s,10,'intelligence','chakraControl');
 if(/close|taijutsu|pressure|might guy|strength/.test(t))bump(s,12,'taijutsu','strength');
 if(/stealth|shadow|crow|genjutsu|deception|itachi|obito/.test(t))bump(s,10,'genjutsu','intelligence');
 if(/adaptive|water|wind|versatile|monkey/.test(t))bump(s,11,'adaptability','speed');
 if(/lightning|hawk|mobility|speed/.test(t))bump(s,10,'speed','ninjutsu');
 if(/earth|slug|turtle|guardian|stamina/.test(t))bump(s,10,'stamina','strength');
 if(/fire|front-line|assault/.test(t))bump(s,9,'ninjutsu','strength');
 if(/support|healing|medical/.test(t))bump(s,11,'chakraControl','leadership');
 if(/commander|inspirer|kage|leadership/.test(t))bump(s,13,'leadership','intelligence');
 if(/elite|legendary|kage potential/.test(t))bump(s,7,...keys);
 if(p.primaryChakra)bump(s,8,'ninjutsu'); if(p.secondaryChakra)bump(s,4,'ninjutsu','adaptability'); if(p.advancedRelease)bump(s,5,'ninjutsu','chakraControl');
 const confidence=Object.values(p.raw).filter(Boolean).reduce((a,r)=>a+(r?.confidence||0),0)/Math.max(1,Object.keys(p.raw).length); bump(s,Math.round((confidence-50)/12),'intelligence','adaptability');
 keys.forEach(k=>s[k]=Math.max(35,Math.min(99,Math.round(s[k])))); return s;
}
export const statLabels:Record<StatKey,string>={ninjutsu:'Ninjutsu',taijutsu:'Taijutsu',genjutsu:'Genjutsu',intelligence:'Intelligence',speed:'Speed',strength:'Strength',stamina:'Stamina',chakraControl:'Chakra Control',leadership:'Leadership',adaptability:'Adaptability'};
