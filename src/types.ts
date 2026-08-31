// Central type contract for the current Shinobi Identity Archive release.

export type TestId='clan'|'village'|'mentor'|'rogue'|'chakra'|'summon'|'fighting'|'weapon'|'leadership'|'rank'|'inherited'|'specialty'|'teamRole';
export type TestLength='short'|'medium'|'long';
export type ScoreMap=Record<string,number>;
export interface Answer { text:string; scores:ScoreMap }
export interface Question { id:string; theme:string; prompt:string; answers:Answer[] }
export interface Outcome { id:string; label:string; symbol:string; description:string; rarity?:number; traits?:string[]; strengths?:string[]; weaknesses?:string[]; specialty?:string; jutsu?:string[]; theme?:string }
export interface TestDefinition { id:TestId; label:string; shortLabel:string; icon:string; description:string; questionCount:number; lengths?:Record<TestLength,number>; questions:Question[]; outcomes:Record<string,Outcome> }
export interface TestResult { testId:TestId; winner:string; confidence:number; secondary?:string; advanced?:string; alternates:{id:string;percent:number}[]; meta?:Record<string,string|number|string[]> }

export type PortraitMode='portrait'|'full-body'|'action'|'dossier';
export type GeneratorOptions={mode:PortraitMode;quality:'medium'|'high';preserveHair:boolean;showSummon:boolean;showDojutsu:boolean};
export type GeneratorRequest={photoDataUrl:string;prompt:string;mode:PortraitMode;quality:'medium'|'high'};
export type GeneratorResponse={imageDataUrl:string;provider?:string;model?:string;creditsUsed?:number;creditsRemaining?:number;generationId?:string};

export type StatKey='ninjutsu'|'taijutsu'|'genjutsu'|'intelligence'|'speed'|'strength'|'stamina'|'chakraControl'|'leadership'|'adaptability';
export type CombatStats=Record<StatKey,number>;
export type JutsuRank='D'|'C'|'B'|'A'|'S';
export type JutsuSlot='standard'|'advanced'|'signature'|'ultimate'|'summoning';
export interface NormalizedShinobiProfile{
  name:string;characterId:string|null;clan:string;village:string;primaryChakra:string;secondaryChakra:string;advancedRelease:string;summon:string;mentor:string;shadow:string;fightingStyle:string;weaponAffinity:string;leadershipStyle:string;rankPotential:string;inheritedPotential:string;specialty:string;teamRole:string;completion:number;raw:Partial<Record<TestId,TestResult>>;
}
export interface JutsuTechnique{
  id:string;character_id?:string;user_id?:string;name:string;rank:JutsuRank;type:string;chakraNature:string;range:string;role:string;chakraCost:string;description:string;strengths:string[];weaknesses:string[];requirements:string[];synergies:string[];slot:JutsuSlot|null;created_at?:string;
}

export type MissionRank='D'|'C'|'B'|'A'|'S';
export type MissionStatus='offered'|'accepted'|'completed'|'failed'|'abandoned';
export interface MissionRewards{xp:number;reputation:number;badge?:string|null}
export interface ShinobiMission{
  id:string;user_id?:string;character_id?:string;title:string;rank:MissionRank;category:string;objective:string;briefing:string;location:string;recommended_traits:string[];rewards:MissionRewards;status:MissionStatus;outcome?:string|null;created_at?:string;accepted_at?:string|null;completed_at?:string|null;
}
export interface ShinobiProgression{
  character_id:string;user_id:string;xp:number;level:number;village_reputation:number;completed_missions:number;d_missions:number;c_missions:number;b_missions:number;a_missions:number;s_missions:number;current_title:string;updated_at:string;
}
export interface ProgressionAchievement{id:string;icon:string;label:string;description:string;earned:boolean}

export type ProfileTheme='ember'|'storm'|'mist'|'forest'|'sand'|'void';
export type CharacterLore={character_id:string;user_id:string|null;origin_story:string;academy_history:string;mentor_history:string;turning_point:string;current_objective:string;personality_summary:string;bingo_alias:string;threat_rating:string;intelligence_notes:string;updated_at:string};
export type TimelineEvent={id:string;character_id:string;user_id:string|null;event_type:string;title:string;detail:string;event_order:number;created_at:string};
export type ProfileCustomization={shinobi_alias:string|null;profile_title:string|null;profile_theme:ProfileTheme|null;banner_url:string|null;featured_art_url:string|null};

export type ShinobiCharacter={id:string;user_id:string|null;name:string;clan:string|null;village:string|null;chakra_primary:string|null;chakra_secondary:string|null;advanced_release:string|null;summon:string|null;sensei:string|null;shadow_mirror:string|null;rank:string|null;role:string|null;leadership:string|null;inherited_trait:string|null;specialization:string|null;portrait_url:string|null;completion_percent:number;is_active:boolean;is_public:boolean;public_slug:string|null;bio:string|null;published_at:string|null;shinobi_alias:string|null;profile_title:string|null;profile_theme:string|null;banner_url:string|null;featured_art_url:string|null;created_at:string;updated_at:string};
export type MatchupEdge='left'|'right'|'even';
export interface MatchupFactor { label:string; left:number; right:number; edge:MatchupEdge; note:string }
export interface MatchupAnalysis {winnerId:string|null;winnerName:string;confidence:number;leftScore:number;rightScore:number;summary:string;factors:MatchupFactor[];counters:string[];winConditions:{left:string[];right:string[]}}
export interface SocialCombatant { character:ShinobiCharacter; stats:CombatStats }
export interface ShinobiTeam { id:string; user_id:string; name:string; description:string|null; created_at:string; updated_at:string }
export interface ShinobiTeamMember { id:string; team_id:string; character_id:string; position:number; role_label:string|null; created_at:string; character?:ShinobiCharacter }
export interface ShinobiRival { id:string; user_id:string; character_id:string; rival_character_id:string; note:string|null; created_at:string; rival?:ShinobiCharacter; character?:ShinobiCharacter }
export interface MatchupRecord { id:string; user_id:string; left_character_id:string; right_character_id:string; winner_character_id:string|null; analysis:MatchupAnalysis; created_at:string }
export interface TeamAnalysis { rating:number; cohesion:number; coverage:number; leadership:number; strengths:string[]; weaknesses:string[]; roleAssignments:{characterId:string;name:string;role:string}[] }
