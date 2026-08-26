import type{TestResult}from '../../types/quiz';
import type{GeneratorOptions}from '../../types/generator';
import{tests}from '../../data/tests';

type Results=Partial<Record<'clan'|'village'|'mentor'|'rogue'|'chakra'|'summon',TestResult>>;
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
