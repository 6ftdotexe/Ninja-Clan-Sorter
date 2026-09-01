import {requireSupabase,supabase,unwrapMaybe} from '../lib/supabase';
import type {MissionRank,TeamOperation,TeamOperationResult,VillageWarDeployment,VillageWarSeason,VillageWarStanding,VillageWarResult} from '../types';

export async function listTeamOperations(teamId:string):Promise<TeamOperation[]>{
  if(!supabase||!teamId)return[];
  const data=unwrapMaybe<TeamOperation[]>(await supabase.rpc('list_team_operations',{p_team_id:teamId}));
  return Array.isArray(data)?data:[];
}

export async function deployTeamOperation(teamId:string,rank:MissionRank):Promise<TeamOperationResult>{
  return unwrapMaybe<TeamOperationResult>(await requireSupabase().rpc('deploy_team_operation',{p_team_id:teamId,p_rank:rank})) as TeamOperationResult;
}

export async function getActiveVillageWar():Promise<VillageWarSeason|null>{
  if(!supabase)return null;
  return unwrapMaybe<VillageWarSeason>(await supabase.rpc('get_active_village_war'));
}

export async function listVillageWarStandings():Promise<VillageWarStanding[]>{
  if(!supabase)return[];
  const data=unwrapMaybe<VillageWarStanding[]>(await supabase.rpc('list_village_war_standings'));
  return Array.isArray(data)?data:[];
}

export async function listVillageWarDeployments(teamId?:string):Promise<VillageWarDeployment[]>{
  if(!supabase)return[];
  const data=unwrapMaybe<VillageWarDeployment[]>(await supabase.rpc('list_my_village_war_deployments',{p_team_id:teamId||null}));
  return Array.isArray(data)?data:[];
}

export async function deployVillageWarTeam(teamId:string):Promise<VillageWarResult>{
  return unwrapMaybe<VillageWarResult>(await requireSupabase().rpc('deploy_village_war_team',{p_team_id:teamId})) as VillageWarResult;
}
