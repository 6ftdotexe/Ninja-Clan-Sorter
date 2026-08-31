import type { CombatStats } from './combat';
import type { ShinobiCharacter } from '../services/characterService';

export type MatchupEdge='left'|'right'|'even';
export interface MatchupFactor { label:string; left:number; right:number; edge:MatchupEdge; note:string }
export interface MatchupAnalysis {
  winnerId:string|null;
  winnerName:string;
  confidence:number;
  leftScore:number;
  rightScore:number;
  summary:string;
  factors:MatchupFactor[];
  counters:string[];
  winConditions:{left:string[];right:string[]};
}
export interface SocialCombatant { character:ShinobiCharacter; stats:CombatStats }
export interface ShinobiTeam { id:string; user_id:string; name:string; description:string|null; created_at:string; updated_at:string }
export interface ShinobiTeamMember { id:string; team_id:string; character_id:string; position:number; role_label:string|null; created_at:string; character?:ShinobiCharacter }
export interface ShinobiRival { id:string; user_id:string; character_id:string; rival_character_id:string; note:string|null; created_at:string; rival?:ShinobiCharacter; character?:ShinobiCharacter }
export interface MatchupRecord { id:string; user_id:string; left_character_id:string; right_character_id:string; winner_character_id:string|null; analysis:MatchupAnalysis; created_at:string }
export interface TeamAnalysis { rating:number; cohesion:number; coverage:number; leadership:number; strengths:string[]; weaknesses:string[]; roleAssignments:{characterId:string;name:string;role:string}[] }
