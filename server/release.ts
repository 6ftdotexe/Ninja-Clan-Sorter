import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SupabaseClient } from '@supabase/supabase-js';

export const APP_VERSION = '10.5.1';
export const EXPECTED_SCHEMA_VERSION = '10.5.0';
export const RELEASE_CHANNEL = process.env.RELEASE_CHANNEL?.trim() || (process.env.NODE_ENV === 'production' ? 'production' : 'development');
export const BUILD_COMMIT = (process.env.RENDER_GIT_COMMIT || process.env.BUILD_COMMIT || process.env.GIT_COMMIT || 'local').trim();
export const BUILD_ID = (process.env.RENDER_SERVICE_ID || process.env.BUILD_ID || `${APP_VERSION}-${BUILD_COMMIT.slice(0, 12)}`).trim();
export const BUILD_TIMESTAMP = process.env.BUILD_TIMESTAMP?.trim() || null;

export type ReleaseInfo = {
  appVersion: string;
  frontendVersion: string;
  serverVersion: string;
  schemaVersion: string | null;
  expectedSchemaVersion: string;
  schemaMatches: boolean;
  releaseMatches: boolean;
  commit: string;
  buildId: string;
  builtAt: string | null;
  channel: string;
};

export async function readSchemaVersion(admin: SupabaseClient | null): Promise<string | null> {
  if (!admin) return null;
  const { data, error } = await admin.rpc('get_app_schema_version');
  if (error) throw error;
  return typeof data === 'string' && data.trim() ? data.trim() : null;
}

async function readFrontendRelease() {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const manifestPath = path.resolve(__dirname, '../dist/release.json');
    return JSON.parse(await readFile(manifestPath, 'utf8')) as { frontendVersion?: string; commit?: string; buildId?: string; builtAt?: string };
  } catch { return null; }
}

export async function getReleaseInfo(admin: SupabaseClient | null): Promise<ReleaseInfo> {
  let schemaVersion: string | null = null;
  try { schemaVersion = await readSchemaVersion(admin); } catch { schemaVersion = null; }
  const frontend = await readFrontendRelease();
  const frontendVersion = frontend?.frontendVersion || APP_VERSION;
  const schemaMatches = schemaVersion === EXPECTED_SCHEMA_VERSION;
  return {
    appVersion: APP_VERSION,
    frontendVersion,
    serverVersion: APP_VERSION,
    schemaVersion,
    expectedSchemaVersion: EXPECTED_SCHEMA_VERSION,
    schemaMatches,
    releaseMatches: frontendVersion === APP_VERSION && schemaMatches,
    commit: frontend?.commit || BUILD_COMMIT,
    buildId: frontend?.buildId || BUILD_ID,
    builtAt: frontend?.builtAt || BUILD_TIMESTAMP,
    channel: RELEASE_CHANNEL,
  };
}

export async function verifyPackageVersion() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const packagePath = path.resolve(__dirname, '../package.json');
  const pkg = JSON.parse(await readFile(packagePath, 'utf8')) as { version?: string };
  if (pkg.version !== APP_VERSION) throw new Error(`Release version mismatch: package.json=${pkg.version || 'missing'} server=${APP_VERSION}`);
}
