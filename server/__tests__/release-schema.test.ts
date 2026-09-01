import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_VERSION, EXPECTED_SCHEMA_VERSION, getReleaseInfo, verifyPackageVersion } from '../release.js';
import { runPreflight } from '../preflight.js';

describe('release contract', () => {
  it('keeps package.json aligned with the server release', async () => {
    await expect(verifyPackageVersion()).resolves.toBeUndefined();
    expect(APP_VERSION).toBe('11.5.5');
  });

  it('ships the TypeScript runtime used by npm start as a production dependency', async () => {
    const pkg = JSON.parse(await readFile(path.resolve(process.cwd(), 'package.json'), 'utf8')) as { dependencies?: Record<string,string>; devDependencies?: Record<string,string> };
    expect(pkg.dependencies?.tsx).toBeTruthy();
    expect(pkg.devDependencies?.tsx).toBeUndefined();
  });

  it('keeps the V11.4.0 gameplay schema for the interactive client release', () => {
    expect(EXPECTED_SCHEMA_VERSION).toBe('11.4.0');
  });

  it('reports a matching frontend/server/schema release contract', async () => {
    const fakeAdmin = {
      rpc: async () => ({ data: EXPECTED_SCHEMA_VERSION, error: null }),
    };
    const info = await getReleaseInfo(fakeAdmin as never);
    expect(info.serverVersion).toBe(APP_VERSION);
    expect(info.schemaVersion).toBe(EXPECTED_SCHEMA_VERSION);
    expect(info.schemaMatches).toBe(true);
  });

  it('passes static preflight without requiring live cloud credentials', async () => {
    const result = await runPreflight({ live: false, strict: false });
    expect(result.ok).toBe(true);
    expect(result.version).toBe(APP_VERSION);
    expect(result.schemaExpected).toBe(EXPECTED_SCHEMA_VERSION);
  });
});

describe('Supabase security/schema contracts', () => {
  it('retains the critical service-role and public-data boundaries', async () => {
    const sql = await readFile(path.resolve(process.cwd(), 'supabase/schema.sql'), 'utf8');
    const required = [
      'grant execute on function public.grant_generation_credits(uuid,integer) to service_role;',
      'grant execute on function public.reserve_generation_credits(uuid,integer) to service_role;',
      'grant execute on function public.record_generation_payment(uuid,text,text,integer,integer,text) to service_role;',
      'revoke all on public.app_release_metadata from public,anon,authenticated;',
      'grant execute on function public.get_app_schema_version() to service_role;',
      'create unique index if not exists generations_one_processing_per_user_idx',
      'create unique index if not exists shinobi_one_active_per_user_idx',
      'create or replace function public.consume_api_rate_limit(',
      'create or replace function public.get_public_shinobi_profile_bundle(p_slug text)',
      'create or replace function public.complete_shinobi_mission_v10(',
      'create table if not exists public.village_memberships',
      'create or replace function public.join_village(',
      'create or replace function public.list_village_directory()',
      'create or replace function public.get_shinobi_career(',
      'create or replace function public.get_public_shinobi_career(',
      'alter table public.shinobi_progression add column if not exists training_points',
      'alter table public.shinobi_progression add column if not exists ryo',
      'alter table public.jutsu_techniques add column if not exists mastery_level',
      'create table if not exists public.shinobi_equipment',
      'create or replace function public.get_shinobi_training(',
      'create or replace function public.train_shinobi_stat(',
      'create or replace function public.train_jutsu_mastery(',
      'create or replace function public.purchase_shinobi_equipment(',
      'create or replace function public.equip_shinobi_equipment(',
      'grant update(slot) on public.jutsu_techniques to authenticated;',
      'create table if not exists public.shinobi_competitive_seasons',
      'create table if not exists public.chunin_exam_entries',
      'create table if not exists public.shinobi_competitive_records',
      'create or replace function public.register_chunin_exam(',
      'create or replace function public.advance_chunin_exam(',
      'create or replace function public.get_shinobi_competitive_record(',
      'create or replace function public.list_competitive_leaderboard(',
      'create table if not exists public.shinobi_world_events',
      'create table if not exists public.shinobi_world_event_participation',
      'create table if not exists public.rogue_shinobi_profiles',
      'create or replace function public.list_active_world_events()',
      'create or replace function public.participate_world_event(',
      'create or replace function public.become_rogue(',
      'create or replace function public.renounce_rogue_status(',
      'create or replace function public.list_public_bingo_book(',
      'create table if not exists public.shinobi_team_operations',
      'create or replace function public.deploy_team_operation(',
      'create unique index if not exists shinobi_team_operations_daily_rank_idx',
      'create table if not exists public.village_war_seasons',
      'create table if not exists public.village_war_deployments',
      'create or replace function public.get_active_village_war()',
      'create or replace function public.list_village_war_standings()',
      'create or replace function public.deploy_village_war_team(',
    ];
    for (const contract of required) expect(sql.toLowerCase()).toContain(contract.toLowerCase());
  });

  it('does not grant browser roles direct access to service-role credit functions', async () => {
    const sql = (await readFile(path.resolve(process.cwd(), 'supabase/schema.sql'), 'utf8')).toLowerCase();
    expect(sql).not.toMatch(/grant execute on function public\.grant_generation_credits\([^;]+\) to (anon|authenticated)/);
    expect(sql).not.toMatch(/grant execute on function public\.reserve_generation_credits\([^;]+\) to (anon|authenticated)/);
    expect(sql).not.toMatch(/grant execute on function public\.record_generation_payment\([^;]+\) to (anon|authenticated)/);
  });
});
