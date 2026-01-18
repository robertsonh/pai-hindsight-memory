# Tasks: PreCompact Timeout Fix

## Implementation Checklist

- [x] **1. Add required imports to hindsight-pre-compact.ts**
  - Add `spawn` from `child_process`
  - Add `dirname` from `path`

- [x] **2. Modify main() to spawn background process**
  - Remove inline `extractInsights()` and `storeInsights()` calls
  - Add background script path resolution
  - Spawn detached process with `spawn()`
  - Pass environment variables
  - Call `child.unref()` to allow parent exit

- [ ] **3. Test the fix**
  - Start a new Claude Code session
  - Work long enough to generate a large transcript (>100KB)
  - Trigger compaction (automatic or manual)
  - Verify hook exits within 60 seconds
  - Check debug log for spawn confirmation
  - Wait 3-5 minutes for background extraction
  - Query Hindsight to verify insights were stored

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/hindsight-pre-compact.ts` | Replace inline extraction with background spawn |

## Files to Reference (read-only)

| File | Purpose |
|------|---------|
| `src/hooks/hindsight-session-save.ts` | Pattern to copy (lines 541-580) |
| `src/hooks/hindsight-extract-insights-bg.ts` | Script to spawn |

## Definition of Done

- [ ] PreCompact hook exits within 5 seconds of starting
- [ ] Background process spawns successfully
- [ ] Insights are stored to Hindsight after background process completes
- [ ] No errors in debug log
- [ ] Code follows existing patterns in the codebase
