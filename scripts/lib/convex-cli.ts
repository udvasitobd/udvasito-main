/**
 * Runs the local Convex CLI with exact arguments on Windows, macOS and Linux (no shell, so JSON arguments are
 * passed unchanged). Used by the seed / import scripts.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

export type Target = { prod: boolean };

/** `--prod` → production deployment of the configured project (or the deployment of CONVEX_DEPLOY_KEY). */
export function parseTarget(argv: readonly string[]): Target {
  return { prod: argv.includes('--prod') };
}

export function argValue(argv: readonly string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

export function runConvex(args: readonly string[], target: Target): string {
  const cli = path.join(process.cwd(), 'node_modules', 'convex', 'bin', 'main.js');
  const result = spawnSync(process.execPath, [cli, ...args, ...(target.prod ? ['--prod'] : [])], {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'inherit'],
  });
  if (result.status !== 0) {
    throw new Error(`convex ${args[0]} failed (exit ${result.status ?? 'unknown'})`);
  }
  return result.stdout;
}

/** `convex run <fn> <json>` → parsed JSON result. */
export function runFunction<T>(fn: string, args: unknown, target: Target): T {
  const out = runConvex(['run', fn, JSON.stringify(args)], target).trim();
  return (out === '' ? null : JSON.parse(out)) as T;
}
