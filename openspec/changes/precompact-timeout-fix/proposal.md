# Proposal: Fix PreCompact Hook Timeout

## Summary

The PreCompact hook times out before completing insight extraction, losing valuable session context. Apply the same background process pattern used in the session-save hook.

## Motivation

The PreCompact hook processes conversation transcripts to extract insights (decisions, mistakes, corrections, key context) before compaction clears the conversation. However, Claude Code enforces a 60-second timeout on hooks, and processing large transcripts can take 2-3 minutes.

**Evidence from logs:**
```
[2026-01-18T04:10:26.414Z] PreCompact: Transcript split into 9 chunks
[2026-01-18T04:10:26.414Z] PreCompact: Processing chunk 1/9 (19126 chars)
... chunks 1-8 processed successfully ...
[2026-01-18T04:10:48.769Z] PreCompact: Processing chunk 8/9 (19993 chars)
[2026-01-18T04:12:58.490Z] SessionStart: project=pai-hindsight-memory...
```

The hook was killed after ~2.5 minutes, mid-way through chunk 8. The insights were never stored.

## Scope

### In Scope
- Modify `hindsight-pre-compact.ts` to spawn background process for insight extraction
- Reuse existing `hindsight-extract-insights-bg.ts` script

### Out of Scope
- Changes to the background extraction script itself
- Changes to the insight extraction library

## Technical Context

### Current Implementation (times out)
`src/hooks/hindsight-pre-compact.ts` calls insight extraction inline:
```typescript
const insights = await extractInsights(LOG_PREFIX, transcriptPath, projectName);
await storeInsights(LOG_PREFIX, insights, projectName, sessionId, 'pre-compact-analysis');
```

### Proven Solution Pattern
`src/hooks/hindsight-session-save.ts` uses background spawning:
```typescript
const child = spawn('bun', ['run', bgScript, transcriptPath, projectName, sessionId], {
  detached: true,
  stdio: 'ignore',
  env: { ... },
});
child.unref();
```

This pattern allows the hook to exit immediately while insight extraction continues in the background.

## Success Criteria

1. PreCompact hook completes within 60 seconds
2. Insights from the full conversation are extracted and stored
3. Background process runs to completion without affecting Claude Code
