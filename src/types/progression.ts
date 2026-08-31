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
