import 'dotenv/config';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { admin, validateConfiguration } from './config.js';
import { APP_VERSION, EXPECTED_SCHEMA_VERSION, readSchemaVersion, verifyPackageVersion } from './release.js';

export type PreflightResult = {
  ok: boolean;
  version: string;
  schemaExpected: string;
  schemaActual?: string | null;
  errors: string[];
  warnings: string[];
};

export async function runPreflight(options: { live?: boolean; artifact?: boolean; strict?: boolean } = {}): Promise<PreflightResult> {
  const config = validateConfiguration({ strict: options.strict });
  const errors = [...config.errors];
  const warnings = [...config.warnings];
  try { await verifyPackageVersion(); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }

  if (options.artifact) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const dist = path.resolve(__dirname, '../dist');
    try {
      const manifest = JSON.parse(await readFile(path.join(dist, 'release.json'), 'utf8')) as { frontendVersion?: string };
      if (manifest.frontendVersion !== APP_VERSION) errors.push(`Built frontend is ${manifest.frontendVersion || 'unknown'}; expected ${APP_VERSION}.`);
    } catch (error) {
      errors.push(`Built frontend release manifest is missing or invalid: ${error instanceof Error ? error.message : String(error)}`);
    }
    try {
      const html = await readFile(path.join(dist, 'index.html'), 'utf8');
      if (!/<div[^>]+id=["']root["']/i.test(html)) errors.push('Built index.html is missing the React root mount.');
      if (!/\/assets\//.test(html)) errors.push('Built index.html does not reference versioned application assets.');
    } catch (error) {
      errors.push(`Built index.html is missing or unreadable: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  let schemaActual: string | null | undefined;
  if (options.live) {
    if (!admin) errors.push('Live preflight requires configured Supabase admin credentials.');
    else {
      try {
        schemaActual = await readSchemaVersion(admin);
        if (schemaActual !== EXPECTED_SCHEMA_VERSION) errors.push(`Database schema is ${schemaActual || 'unknown'}; expected ${EXPECTED_SCHEMA_VERSION}. Re-run supabase/schema.sql.`);
      } catch (error) {
        errors.push(`Database schema check failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return { ok: errors.length === 0, version: APP_VERSION, schemaExpected: EXPECTED_SCHEMA_VERSION, schemaActual, errors, warnings };
}

async function main() {
  const live = process.argv.includes('--live');
  const artifact = process.argv.includes('--artifact');
  const result = await runPreflight({ live, artifact, strict: true });
  for (const warning of result.warnings) console.warn(`WARN: ${warning}`);
  for (const error of result.errors) console.error(`ERROR: ${error}`);
  if (result.ok) console.log(`Preflight OK — V${result.version}${live ? ` / schema ${result.schemaActual}` : ''}${artifact ? ' / build artifact verified' : ''}`);
  process.exitCode = result.ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) void main();
