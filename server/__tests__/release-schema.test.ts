import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_VERSION, EXPECTED_SCHEMA_VERSION, getReleaseInfo, verifyPackageVersion } from '../release.js';
import { runPreflight } from '../preflight.js';

describe('release contract', () => {
  it('keeps package.json aligned with the server release', async () => {
    await expect(verifyPackageVersion()).resolves.toBeUndefined();
    expect(APP_VERSION).toBe('10.5.0');
  });

  it('ships the TypeScript runtime used by npm start as a production dependency', async () => {
    const pkg = JSON.parse(await readFile(path.resolve(process.cwd(), 'package.json'), 'utf8')) as { dependencies?: Record<string,string>; devDependencies?: Record<string,string> };
    expect(pkg.dependencies?.tsx).toBeTruthy();
    expect(pkg.devDependencies?.tsx).toBeUndefined();
  });

  it('allows the application release to advance without requiring an unchanged schema migration', () => {
    expect(EXPECTED_SCHEMA_VERSION).toBe('10.5.0');
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
