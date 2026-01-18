# Spec: PreCompact Background Extraction

## Overview

Modify the PreCompact hook to spawn a background process for insight extraction, preventing Claude Code's 60-second hook timeout from killing the process mid-extraction.

## Technical Design

### File to Modify
- `src/hooks/hindsight-pre-compact.ts`

### File to Reuse
- `src/hooks/hindsight-extract-insights-bg.ts` (already exists)

### Changes Required

#### 1. Add Imports

```typescript
import { spawn } from 'child_process';
import { dirname } from 'path';
```

#### 2. Replace Inline Extraction with Background Spawn

**Before (current code that times out):**
```typescript
// Extract insights using shared library
const insights = await extractInsights(LOG_PREFIX, transcriptPath, projectName);

if (!insights) {
  log(LOG_PREFIX, 'No insights extracted');
  process.exit(0);
}

// Store to Hindsight
const stored = await storeInsights(LOG_PREFIX, insights, projectName, sessionId, 'pre-compact-analysis');

if (stored) {
  console.log(`Pre-compact: Extracted and stored insights for ${projectName}`);
}
```

**After (spawn background process):**
```typescript
// Spawn background process for insight extraction
// This allows the hook to exit quickly while extraction runs asynchronously
log(LOG_PREFIX, `Spawning background insight extraction for ${projectName}`);

try {
  const scriptDir = dirname(new URL(import.meta.url).pathname);
  let bgScript = join(scriptDir, 'hindsight-extract-insights-bg.ts');

  // Fallback to PAI hooks directory if not found
  if (!existsSync(bgScript)) {
    bgScript = join(PAI_DIR, 'hooks', 'hindsight-extract-insights-bg.ts');
  }

  if (existsSync(bgScript)) {
    const child = spawn('bun', ['run', bgScript, transcriptPath, projectName, sessionId], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        PAI_DIR,
        HINDSIGHT_PROJECT_URL: process.env.HINDSIGHT_PROJECT_URL || 'http://localhost:8889',
        HINDSIGHT_PROJECT: process.env.HINDSIGHT_PROJECT || 'project',
      },
    });

    child.unref();
    log(LOG_PREFIX, `Background extraction spawned (PID: ${child.pid})`);
    console.log(`Pre-compact: Background extraction started for ${projectName}`);
  } else {
    log(LOG_PREFIX, `Background script not found at ${bgScript}`);
  }
} catch (spawnError) {
  log(LOG_PREFIX, `Failed to spawn background extraction: ${spawnError}`);
}
```

### Process Flow

```
┌─────────────────────┐
│   PreCompact Hook   │
│    (main process)   │
└──────────┬──────────┘
           │ spawn detached
           ▼
┌─────────────────────┐
│  Background Script  │
│ hindsight-extract-  │
│   insights-bg.ts    │
└──────────┬──────────┘
           │ (parent exits)
           ▼
┌─────────────────────┐
│  Continues running  │
│  - Parse transcript │
│  - Extract insights │
│  - Store to Hindsight│
└─────────────────────┘
```

### Environment Variables Passed to Background Process

| Variable | Purpose |
|----------|---------|
| PAI_DIR | PAI installation directory for logging |
| HINDSIGHT_PROJECT_URL | Hindsight API endpoint |
| HINDSIGHT_PROJECT | Project memory bank name |
| LOCAL_LLM_URL | (inherited) Local LLM endpoint |
| LOCAL_LLM_MODEL | (inherited) LLM model name |

## Testing

1. Trigger a long session that would previously timeout
2. Verify hook exits within 60 seconds
3. Check debug log for "Background extraction spawned" message
4. Wait for background process to complete
5. Verify insights appear in Hindsight memory bank

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Background process fails silently | Log file captures errors |
| Multiple background processes pile up | Each uses minimal memory, and new sessions are spaced apart |
| Orphaned processes | Bun runtime handles cleanup; process exits after completion |
