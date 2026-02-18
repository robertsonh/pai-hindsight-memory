#!/usr/bin/env bun
/**
 * PAI Hindsight Memory Pack — Deploy Script
 *
 * Deploys hooks, lib, and skills from this repo to ~/.claude.
 * Run after any PAI upgrade to restore the memory integration.
 *
 * Usage:
 *   bun run deploy          # Deploy to default PAI_DIR (~/.claude)
 *   bun run deploy --dry    # Preview what would be copied
 *   bun run deploy --check  # Verify deployment is current
 *
 * Also wires up hook registrations and env vars in settings.json
 * if they're missing (non-destructive merge).
 */

import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { homedir } from 'os';

const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');
const REPO_DIR = dirname(new URL(import.meta.url).pathname);
const SRC_DIR = join(REPO_DIR, 'src');

const DRY_RUN = process.argv.includes('--dry');
const CHECK_ONLY = process.argv.includes('--check');

// ============================================================================
// File manifest — everything this pack deploys
// ============================================================================

interface DeployEntry {
  src: string;   // relative to src/
  dest: string;  // relative to PAI_DIR
}

const FILES: DeployEntry[] = [
  // Hooks
  { src: 'hooks/hindsight-session-start.ts',      dest: 'hooks/hindsight-session-start.ts' },
  { src: 'hooks/hindsight-session-save.ts',        dest: 'hooks/hindsight-session-save.ts' },
  { src: 'hooks/hindsight-pre-compact.ts',         dest: 'hooks/hindsight-pre-compact.ts' },
  { src: 'hooks/hindsight-post-compact.ts',        dest: 'hooks/hindsight-post-compact.ts' },
  { src: 'hooks/hindsight-extract-insights-bg.ts', dest: 'hooks/hindsight-extract-insights-bg.ts' },

  // Lib
  { src: 'hooks/lib/insight-extractor.ts',         dest: 'hooks/lib/insight-extractor.ts' },

  // Memory skill
  { src: 'skills/Memory/SKILL.md',                 dest: 'skills/Memory/SKILL.md' },
  { src: 'skills/Memory/Workflows/ConfigureBank.md',       dest: 'skills/Memory/Workflows/ConfigureBank.md' },
  { src: 'skills/Memory/Workflows/ManageBanks.md',         dest: 'skills/Memory/Workflows/ManageBanks.md' },
  { src: 'skills/Memory/Workflows/ManageMentalModels.md',  dest: 'skills/Memory/Workflows/ManageMentalModels.md' },
  { src: 'skills/Memory/Workflows/Recall.md',              dest: 'skills/Memory/Workflows/Recall.md' },
  { src: 'skills/Memory/Workflows/Reflect.md',             dest: 'skills/Memory/Workflows/Reflect.md' },
  { src: 'skills/Memory/Workflows/Retain.md',              dest: 'skills/Memory/Workflows/Retain.md' },
];

// ============================================================================
// Hook registrations to ensure in settings.json
// ============================================================================

interface HookRegistration {
  event: string;
  command: string;
}

const HOOK_REGISTRATIONS: HookRegistration[] = [
  { event: 'SessionStart', command: '${PAI_DIR}/hooks/hindsight-session-start.ts' },
  { event: 'SessionEnd',   command: '${PAI_DIR}/hooks/hindsight-session-save.ts' },
  { event: 'PreCompact',   command: '${PAI_DIR}/hooks/hindsight-pre-compact.ts' },
  { event: 'Stop',         command: '${PAI_DIR}/hooks/hindsight-post-compact.ts' },
];

// ============================================================================
// Env vars to ensure in settings.json
// ============================================================================

const REQUIRED_ENV: Record<string, string> = {
  HINDSIGHT_PROJECT_URL: 'http://192.168.86.81:8889',
  HINDSIGHT_PERSONAL_BANK: 'hedley',
};

// ============================================================================
// Helpers
// ============================================================================

function log(msg: string) {
  console.log(msg);
}

function warn(msg: string) {
  console.log(`  WARN: ${msg}`);
}

function ok(msg: string) {
  console.log(`  OK: ${msg}`);
}

function filesMatch(a: string, b: string): boolean {
  if (!existsSync(a) || !existsSync(b)) return false;
  const contentA = readFileSync(a);
  const contentB = readFileSync(b);
  return contentA.equals(contentB);
}

// ============================================================================
// Deploy files
// ============================================================================

function deployFiles(): { copied: number; skipped: number; missing: number } {
  let copied = 0, skipped = 0, missing = 0;

  for (const entry of FILES) {
    const srcPath = join(SRC_DIR, entry.src);
    const destPath = join(PAI_DIR, entry.dest);

    if (!existsSync(srcPath)) {
      warn(`Source missing: ${entry.src}`);
      missing++;
      continue;
    }

    if (CHECK_ONLY) {
      if (filesMatch(srcPath, destPath)) {
        ok(`${entry.dest} is current`);
        skipped++;
      } else if (!existsSync(destPath)) {
        warn(`${entry.dest} is MISSING`);
        missing++;
      } else {
        warn(`${entry.dest} is OUT OF DATE`);
        copied++; // count as "needs update"
      }
      continue;
    }

    // Ensure destination directory exists
    const destDir = dirname(destPath);
    if (!existsSync(destDir)) {
      if (DRY_RUN) {
        log(`  MKDIR: ${destDir}`);
      } else {
        mkdirSync(destDir, { recursive: true });
      }
    }

    // Skip if already identical
    if (filesMatch(srcPath, destPath)) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      log(`  COPY: ${entry.src} → ${entry.dest}`);
    } else {
      copyFileSync(srcPath, destPath);
      log(`  Deployed: ${entry.dest}`);
    }
    copied++;
  }

  return { copied, skipped, missing };
}

// ============================================================================
// Wire settings.json
// ============================================================================

function wireSettings(): { hooked: number; envSet: number } {
  const settingsPath = join(PAI_DIR, 'settings.json');
  let hooked = 0, envSet = 0;

  if (!existsSync(settingsPath)) {
    warn('settings.json not found — skipping hook/env wiring');
    return { hooked, envSet };
  }

  let settings: Record<string, unknown>;
  try {
    settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
  } catch {
    warn('settings.json is not valid JSON — skipping');
    return { hooked, envSet };
  }

  let changed = false;

  // Ensure hooks section exists
  if (!settings.hooks || typeof settings.hooks !== 'object') {
    settings.hooks = {};
  }
  const hooks = settings.hooks as Record<string, unknown[]>;

  // Register each hook if not already present
  for (const reg of HOOK_REGISTRATIONS) {
    if (!hooks[reg.event]) {
      hooks[reg.event] = [];
    }

    const eventHandlers = hooks[reg.event] as Array<Record<string, unknown>>;

    // Check if our hook command is already registered
    const alreadyRegistered = eventHandlers.some(handler => {
      if (handler.hooks && Array.isArray(handler.hooks)) {
        return (handler.hooks as Array<Record<string, string>>).some(
          h => h.command === reg.command
        );
      }
      if (handler.command === reg.command) {
        return true;
      }
      return false;
    });

    if (!alreadyRegistered) {
      // Add as a wildcard-matcher entry matching PAI's hook style
      eventHandlers.push({
        matcher: '*',
        hooks: [{ type: 'command', command: reg.command }],
      });
      changed = true;
      hooked++;

      if (CHECK_ONLY) {
        warn(`Hook MISSING: ${reg.event} → ${reg.command}`);
      } else if (DRY_RUN) {
        log(`  HOOK: ${reg.event} → ${reg.command}`);
      } else {
        log(`  Registered hook: ${reg.event} → ${basename(reg.command)}`);
      }
    } else if (CHECK_ONLY) {
      ok(`Hook registered: ${reg.event} → ${basename(reg.command)}`);
    }
  }

  // Ensure env vars
  if (!settings.env || typeof settings.env !== 'object') {
    settings.env = {};
  }
  const env = settings.env as Record<string, string>;

  for (const [key, defaultValue] of Object.entries(REQUIRED_ENV)) {
    if (!env[key]) {
      env[key] = defaultValue;
      changed = true;
      envSet++;

      if (CHECK_ONLY) {
        warn(`Env MISSING: ${key}`);
      } else if (DRY_RUN) {
        log(`  ENV: ${key}=${defaultValue}`);
      } else {
        log(`  Set env: ${key}=${defaultValue}`);
      }
    } else if (CHECK_ONLY) {
      ok(`Env set: ${key}=${env[key]}`);
    }
  }

  // Write back if changed
  if (changed && !DRY_RUN && !CHECK_ONLY) {
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
    log('  Updated settings.json');
  }

  return { hooked, envSet };
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const mode = CHECK_ONLY ? 'CHECK' : DRY_RUN ? 'DRY RUN' : 'DEPLOY';
  log(`\n=== PAI Hindsight Memory Pack — ${mode} ===`);
  log(`  Source: ${SRC_DIR}`);
  log(`  Target: ${PAI_DIR}\n`);

  if (!existsSync(PAI_DIR)) {
    console.error(`ERROR: PAI_DIR does not exist: ${PAI_DIR}`);
    console.error('Run the PAI installer first, then re-run this deploy script.');
    process.exit(1);
  }

  log('--- Files ---');
  const fileResult = deployFiles();

  log('\n--- Settings ---');
  const settingsResult = wireSettings();

  // Summary
  log('\n--- Summary ---');

  if (CHECK_ONLY) {
    const issues = fileResult.copied + fileResult.missing + settingsResult.hooked + settingsResult.envSet;
    if (issues === 0) {
      log('  All clear — deployment is current.');
    } else {
      log(`  ${issues} issue(s) found. Run \`bun run deploy\` to fix.`);
    }
  } else if (DRY_RUN) {
    log(`  Would copy: ${fileResult.copied} files`);
    log(`  Already current: ${fileResult.skipped} files`);
    log(`  Would register: ${settingsResult.hooked} hooks`);
    log(`  Would set: ${settingsResult.envSet} env vars`);
    log('\n  Run without --dry to apply.');
  } else {
    log(`  Deployed: ${fileResult.copied} files`);
    log(`  Already current: ${fileResult.skipped} files`);
    if (fileResult.missing > 0) log(`  Missing source: ${fileResult.missing} files`);
    log(`  Hooks registered: ${settingsResult.hooked}`);
    log(`  Env vars set: ${settingsResult.envSet}`);
    log('\n  Done. Restart Claude Code to pick up changes.');
  }
}

main();
