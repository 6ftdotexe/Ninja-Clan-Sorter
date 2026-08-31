import type {TestId,TestResult} from '../types/quiz';
import type {NormalizedShinobiProfile} from '../types/combat';

const win=(r:Partial<Record<TestId,TestResult>>,id:TestId)=>r[id]?.winner||'';
export function normalizeProfile(name:string,characterId:string|null,results:Partial<Record<TestId,TestResult>>):NormalizedShinobiProfile{
  const chakra=results.chakra;
  return {name:name||'Unnamed Shinobi',characterId,clan:win(results,'clan'),village:win(results,'village'),primaryChakra:chakra?.winner||'',secondaryChakra:chakra?.secondary||'',advancedRelease:chakra?.advanced||'',summon:win(results,'summon'),mentor:win(results,'mentor'),shadow:win(results,'rogue'),fightingStyle:win(results,'fighting'),weaponAffinity:win(results,'weapon'),leadershipStyle:win(results,'leadership'),rankPotential:win(results,'rank'),inheritedPotential:win(results,'inherited'),specialty:win(results,'specialty'),teamRole:win(results,'teamRole'),completion:Math.round(Object.keys(results).length/13*100),raw:results};
}
