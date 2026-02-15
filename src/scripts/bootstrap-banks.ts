#!/usr/bin/env bun
/**
 * Hindsight Bank Bootstrap Script
 *
 * One-time setup script that configures optimal bank settings:
 * - Bank mission statements
 * - Disposition (skepticism, literalism, empathy)
 * - Default mental models
 * - Project directives
 *
 * Usage:
 *   bun run src/scripts/bootstrap-banks.ts --project pai --personal hedley
 *   bun run src/scripts/bootstrap-banks.ts --project pai  (project only)
 *   bun run src/scripts/bootstrap-banks.ts --personal hedley  (personal only)
 *
 * Environment:
 *   HINDSIGHT_PROJECT_URL - Hindsight API URL (default: http://localhost:8889)
 */

import { parseArgs } from 'util';

const HINDSIGHT_URL = process.env.HINDSIGHT_PROJECT_URL || 'http://localhost:8889';

// Parse arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    project: { type: 'string', short: 'p' },
    personal: { type: 'string', short: 'e' },
    'dry-run': { type: 'boolean', short: 'd' },
  },
});

const projectBank = values.project;
const personalBank = values.personal;
const dryRun = values['dry-run'] || false;

if (!projectBank && !personalBank) {
  console.error('Usage: bun run bootstrap-banks.ts --project <bank_id> [--personal <bank_id>] [--dry-run]');
  console.error('');
  console.error('Examples:');
  console.error('  bun run bootstrap-banks.ts --project pai --personal hedley');
  console.error('  bun run bootstrap-banks.ts --project pai');
  console.error('  bun run bootstrap-banks.ts --personal hedley');
  console.error('  bun run bootstrap-banks.ts --project pai --dry-run');
  process.exit(1);
}

// ============================================================================
// API Helpers
// ============================================================================

async function apiCall(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: unknown }> {
  // Hindsight API returns 307->404 on trailing slashes — strip them
  const cleanPath = path.replace(/\/+$/, '');

  if (dryRun) {
    console.log(`  [DRY RUN] ${method} ${cleanPath}`);
    if (body) console.log(`  Body: ${JSON.stringify(body, null, 2).slice(0, 200)}...`);
    return { ok: true, status: 200, data: {} };
  }

  try {
    const response = await fetch(`${HINDSIGHT_URL}${cleanPath}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const data = response.ok ? await response.json().catch(() => ({})) : await response.text().catch(() => '');
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, data: `Connection error: ${error}` };
  }
}

/**
 * Fetch existing mental model names for a bank to prevent duplicates.
 */
async function getExistingMentalModels(bankId: string): Promise<Set<string>> {
  if (dryRun) return new Set();

  try {
    const response = await fetch(`${HINDSIGHT_URL}/v1/default/banks/${bankId}/mental-models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      const items = data.items || data || [];
      if (Array.isArray(items)) {
        return new Set(items.map((m: { name?: string }) => m.name).filter(Boolean));
      }
    }
  } catch {
    // Can't check — will fall through to create
  }
  return new Set();
}

/**
 * Fetch existing directive names for a bank to prevent duplicates.
 */
async function getExistingDirectives(bankId: string): Promise<Set<string>> {
  if (dryRun) return new Set();

  try {
    const response = await fetch(`${HINDSIGHT_URL}/v1/default/banks/${bankId}/directives`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      const items = data.items || data || [];
      if (Array.isArray(items)) {
        return new Set(items.map((d: { name?: string }) => d.name).filter(Boolean));
      }
    }
  } catch {
    // Can't check — will fall through to create
  }
  return new Set();
}

// ============================================================================
// Project Bank Setup
// ============================================================================

async function setupProjectBank(bankId: string): Promise<void> {
  console.log(`\n=== Setting up PROJECT bank: ${bankId} ===\n`);

  // 1. Create/update bank with mission
  console.log('1. Setting bank mission...');
  const bankResult = await apiCall('PUT', `/v1/default/banks/${bankId}`, {
    name: bankId,
    background: `Project memory bank for ${bankId}`,
    mission: `I am the memory for the ${bankId} project. I track architecture decisions, debugging learnings, deployment procedures, code patterns, and session history. I prioritize accuracy and technical precision. When uncertain, I flag it explicitly.`,
  });
  console.log(`   ${bankResult.ok ? 'OK' : `FAILED (${bankResult.status}): ${bankResult.data}`}`);

  // 2. Set disposition (code-review-like: precise, critical, focused)
  console.log('2. Setting disposition (skepticism:4, literalism:4, empathy:2)...');
  const dispResult = await apiCall('PATCH', `/v1/default/banks/${bankId}/`, {
    disposition: {
      skepticism: 4,
      literalism: 4,
      empathy: 2,
    },
  });
  console.log(`   ${dispResult.ok ? 'OK' : `FAILED (${dispResult.status}): ${dispResult.data}`}`);

  // 3. Create default mental models
  const mentalModels = [
    {
      name: 'project-summary',
      source_query: 'What is this project, its architecture, key decisions, technology stack, and current state?',
      tags: ['project', 'summary'],
      max_tokens: 4096,
    },
    {
      name: 'coding-conventions',
      source_query: 'What coding conventions, patterns, style preferences, and best practices apply to this project?',
      tags: ['project', 'conventions'],
      max_tokens: 2048,
    },
    {
      name: 'deployment-checklist',
      source_query: 'What are the deployment steps, configurations, environment variables, ports, and common gotchas for this project?',
      tags: ['project', 'deployment'],
      max_tokens: 2048,
    },
    {
      name: 'known-issues',
      source_query: 'What known bugs, limitations, workarounds, and recurring problems exist in this project?',
      tags: ['project', 'issues'],
      max_tokens: 2048,
    },
  ];

  // Check existing mental models to avoid expensive duplicates
  console.log('3. Creating mental models (checking for existing first)...');
  const existingModels = await getExistingMentalModels(bankId);
  if (existingModels.size > 0) {
    console.log(`   Found ${existingModels.size} existing model(s): ${[...existingModels].join(', ')}`);
  }

  for (const model of mentalModels) {
    if (existingModels.has(model.name)) {
      console.log(`   SKIP - "${model.name}" already exists`);
      continue;
    }
    console.log(`   Creating "${model.name}"...`);
    const result = await apiCall('POST', `/v1/default/banks/${bankId}/mental-models`, model);
    if (result.ok) {
      console.log(`   OK - "${model.name}" created (will generate asynchronously)`);
    } else {
      console.log(`   FAILED (${result.status}): ${JSON.stringify(result.data).slice(0, 100)}`);
    }
  }

  // 4. Create default directive (check existing first)
  console.log('4. Creating directives (checking for existing first)...');
  const existingDirectives = await getExistingDirectives(bankId);
  if (existingDirectives.size > 0) {
    console.log(`   Found ${existingDirectives.size} existing directive(s): ${[...existingDirectives].join(', ')}`);
  }

  const directives = [
    {
      name: 'accuracy-first',
      content: 'When summarizing technical decisions or code patterns, prioritize accuracy over brevity. If evidence is contradictory or sparse, explicitly flag uncertainty rather than guessing.',
    },
  ];

  for (const directive of directives) {
    if (existingDirectives.has(directive.name)) {
      console.log(`   SKIP - "${directive.name}" already exists`);
      continue;
    }
    console.log(`   Creating "${directive.name}"...`);
    const result = await apiCall('POST', `/v1/default/banks/${bankId}/directives`, directive);
    if (result.ok) {
      console.log(`   OK - "${directive.name}" created`);
    } else {
      console.log(`   FAILED (${result.status}): ${JSON.stringify(result.data).slice(0, 100)}`);
    }
  }

  console.log(`\nProject bank "${bankId}" setup complete.`);
}

// ============================================================================
// Personal Bank Setup
// ============================================================================

async function setupPersonalBank(bankId: string): Promise<void> {
  console.log(`\n=== Setting up PERSONAL bank: ${bankId} ===\n`);

  // 1. Create/update bank with mission
  console.log('1. Setting bank mission...');
  const bankResult = await apiCall('PUT', `/v1/default/banks/${bankId}`, {
    name: bankId,
    background: `Personal memory bank for ${bankId}`,
    mission: `I am the personal memory for ${bankId}. I track preferences, goals, contacts, life events, work history, and cross-project learnings. I prioritize helpfulness and personal context. I should be supportive and remember the human behind the requests.`,
  });
  console.log(`   ${bankResult.ok ? 'OK' : `FAILED (${bankResult.status}): ${bankResult.data}`}`);

  // 2. Set disposition (supportive: trusting, flexible, emotionally aware)
  console.log('2. Setting disposition (skepticism:2, literalism:2, empathy:4)...');
  const dispResult = await apiCall('PATCH', `/v1/default/banks/${bankId}/`, {
    disposition: {
      skepticism: 2,
      literalism: 2,
      empathy: 4,
    },
  });
  console.log(`   ${dispResult.ok ? 'OK' : `FAILED (${dispResult.status}): ${dispResult.data}`}`);

  // 3. Create personal mental models
  const mentalModels = [
    {
      name: 'about-me',
      source_query: 'Who am I? What are my key facts, preferences, background, work history, and personality traits?',
      tags: ['personal', 'identity'],
      max_tokens: 4096,
    },
    {
      name: 'my-goals',
      source_query: 'What are my current goals, plans, aspirations, and things I am working toward?',
      tags: ['personal', 'goals'],
      max_tokens: 2048,
    },
  ];

  // Check existing mental models to avoid expensive duplicates
  console.log('3. Creating mental models (checking for existing first)...');
  const existingModels = await getExistingMentalModels(bankId);
  if (existingModels.size > 0) {
    console.log(`   Found ${existingModels.size} existing model(s): ${[...existingModels].join(', ')}`);
  }

  for (const model of mentalModels) {
    if (existingModels.has(model.name)) {
      console.log(`   SKIP - "${model.name}" already exists`);
      continue;
    }
    console.log(`   Creating "${model.name}"...`);
    const result = await apiCall('POST', `/v1/default/banks/${bankId}/mental-models`, model);
    if (result.ok) {
      console.log(`   OK - "${model.name}" created (will generate asynchronously)`);
    } else {
      console.log(`   FAILED (${result.status}): ${JSON.stringify(result.data).slice(0, 100)}`);
    }
  }

  // 4. Create personal directives (check existing first)
  console.log('4. Creating directives (checking for existing first)...');
  const existingDirectives = await getExistingDirectives(bankId);
  if (existingDirectives.size > 0) {
    console.log(`   Found ${existingDirectives.size} existing directive(s): ${[...existingDirectives].join(', ')}`);
  }

  const directives = [
    {
      name: 'preferences-first',
      content: 'When making recommendations, always consider stored personal preferences first. Prefer self-hosted/ownable solutions. Default to dark mode for tool suggestions. Use bun over npm.',
    },
  ];

  for (const directive of directives) {
    if (existingDirectives.has(directive.name)) {
      console.log(`   SKIP - "${directive.name}" already exists`);
      continue;
    }
    console.log(`   Creating "${directive.name}"...`);
    const result = await apiCall('POST', `/v1/default/banks/${bankId}/directives`, directive);
    if (result.ok) {
      console.log(`   OK - "${directive.name}" created`);
    } else {
      console.log(`   FAILED (${result.status}): ${JSON.stringify(result.data).slice(0, 100)}`);
    }
  }

  console.log(`\nPersonal bank "${bankId}" setup complete.`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log('Hindsight Bank Bootstrap');
  console.log(`Server: ${HINDSIGHT_URL}`);
  if (dryRun) console.log('MODE: DRY RUN (no changes will be made)');

  // Check server connectivity
  try {
    const response = await fetch(`${HINDSIGHT_URL}/v1/default/banks/`, { method: 'GET' });
    if (!response.ok) {
      console.error(`\nERROR: Hindsight server returned ${response.status}. Is it running at ${HINDSIGHT_URL}?`);
      process.exit(1);
    }
    console.log('Server: Connected');
  } catch {
    if (!dryRun) {
      console.error(`\nERROR: Cannot connect to Hindsight at ${HINDSIGHT_URL}. Is it running?`);
      process.exit(1);
    }
  }

  if (projectBank) {
    await setupProjectBank(projectBank);
  }

  if (personalBank) {
    await setupPersonalBank(personalBank);
  }

  console.log('\n=== Bootstrap complete ===');
  console.log('\nNext steps:');
  if (projectBank) {
    console.log(`  - Mental models for "${projectBank}" are generating asynchronously`);
    console.log(`  - Check status: curl ${HINDSIGHT_URL}/v1/default/banks/${projectBank}/mental-models`);
  }
  if (personalBank) {
    console.log(`  - Mental models for "${personalBank}" are generating asynchronously`);
    console.log(`  - Check status: curl ${HINDSIGHT_URL}/v1/default/banks/${personalBank}/mental-models`);
  }
  console.log('  - Start a new Claude Code session to use the enhanced memory system');
}

main();
