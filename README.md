---
name: PAI Hindsight Memory
pack-id: hedley-pai-hindsight-memory-core-v2.0.0
version: 2.0.0
author: Hedley Robertson
description: Long-term memory integration using Hindsight MCP servers with mental models, tagged memories, and automatic session context preservation
type: skill
purpose-type: [productivity, automation, memory]
platform: claude-code
dependencies: [hindsight-mcp-servers]
keywords: [memory, hindsight, mcp, sessions, context, recall, retain, reflect, banks, mental-models, tags, observations]
icon: icons/pai-hindsight-memory.png
---

# PAI Hindsight Memory

> Long-term memory integration for PAI using Hindsight MCP servers - automatic context preservation across sessions with separate project and personal memory banks.

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](https://github.com/danielmiessler/PAI#what-is-pai)

**What is a Pack?** See: [Pack System](https://github.com/danielmiessler/PAI#the-journey-pai-v1x--v20)

This pack integrates Hindsight memory servers with PAI to provide persistent memory across sessions. It enables your AI to:

- **Remember project context** automatically between sessions
- **Store and recall decisions** with per-insight tagging
- **Reflect on patterns** from past work using mental models
- **Separate concerns** with project-specific vs personal memory banks
- **Pre-cached mental models** for instant project summaries and personal context
- **Bank configuration** with mission, disposition, and directives

**Core principle:** Sessions end, but memory persists. Your AI picks up where you left off.

Please follow the installation instructions in INSTALL.md to integrate this pack.

---

## What's Included

### Skill & Workflows

| Component | File | Purpose |
|-----------|------|---------|
| Memory Skill | `src/skills/Memory/SKILL.md` | Manual memory operations with mental model awareness |
| Recall Workflow | `src/skills/Memory/Workflows/Recall.md` | Search memories with budget, tags, and types filtering |
| Retain Workflow | `src/skills/Memory/Workflows/Retain.md` | Store memories with tag taxonomy and timestamps |
| Reflect Workflow | `src/skills/Memory/Workflows/Reflect.md` | Analyze patterns with structured output and context |
| ManageBanks Workflow | `src/skills/Memory/Workflows/ManageBanks.md` | Bank management |
| ManageMentalModels Workflow | `src/skills/Memory/Workflows/ManageMentalModels.md` | CRUD for pre-cached mental models |
| ConfigureBank Workflow | `src/skills/Memory/Workflows/ConfigureBank.md` | Mission, disposition, and directive configuration |

### Hooks

| Component | File | Purpose |
|-----------|------|---------|
| Session Start Hook | `src/hooks/hindsight-session-start.ts` | Load context with mental models, budget tuning, types filter |
| Session Save Hook | `src/hooks/hindsight-session-save.ts` | Auto-save with tags and document deduplication |
| Pre-Compact Hook | `src/hooks/hindsight-pre-compact.ts` | Extract insights before compaction |
| Post-Compact Hook | `src/hooks/hindsight-post-compact.ts` | Restore context via tag-based recall, reflect, and mental models |
| Insight Extractor Background | `src/hooks/hindsight-extract-insights-bg.ts` | Background insight extraction worker |
| Insight Extractor Library | `src/hooks/lib/insight-extractor.ts` | Batch retain with per-insight tagging |

### Scripts

| Component | File | Purpose |
|-----------|------|---------|
| Bootstrap Banks | `src/scripts/bootstrap-banks.ts` | One-time bank setup: mission, disposition, mental models, directives |

**Summary:**
- **Files:** 14 (7 skill/workflow, 6 hooks, 1 script)
- **Hooks registered:** 4 lifecycle events (SessionStart, SessionEnd, PreCompact, Stop)
- **Dependencies:** Hindsight MCP servers (hindsight-project, hindsight-hedley)
- **Requires:** Hindsight v0.4.0+ (for mental models, observations, agentic reflect)

---

## The Problem

AI agents lose all context between sessions. Each conversation starts fresh:

- Yesterday's architectural decision? Forgotten.
- Last week's debugging insight? Gone.
- The pattern you've been using across projects? Rediscovered every time.

This creates cascading problems:

**For Project Continuity:**
- Re-explaining context every session
- Repeating decisions already made
- Lost momentum on multi-day tasks

**For Personal Productivity:**
- Preferences must be restated
- History is lost
- No institutional memory builds up

**For Code Quality:**
- Lessons learned don't persist
- Patterns aren't recognized
- Mistakes get repeated

---

## The Solution

This pack integrates two Hindsight memory banks:

1. **hindsight-project** - Per-project memories
   - Architectural decisions
   - Bug fixes and their causes
   - Feature implementations
   - Project-specific patterns

2. **hindsight-hedley** - Personal memories
   - Coding preferences
   - Technology choices
   - Goals and career context
   - Information that transcends projects

**Automatic Session Memory:**

```
Session Ends
    ↓
hindsight-session-save.ts hook fires
    ↓
Extracts: project name, files touched, topic, duration
    ↓
Stores with tags: ['session', 'session-YYYY-MM-DD']
    ↓
document_id prevents duplicates on session resume
    ↓
Next session: context available via recall
```

**Pre-Compaction Insight Extraction:**

When Claude's context window fills up and compaction is triggered, the pre-compact hook extracts structured insights before they're lost:

```
Context Full → PreCompact Hook Fires
    ↓
Reads full conversation transcript
    ↓
LLM extracts: decisions, mistakes, corrections, key context
    ↓
Batch retain: each insight stored individually with its own tag
    ↓
Tags: ['decision'], ['mistake'], ['correction'], ['context']
    ↓
document_id: insights_{sessionId} (deduplication)
    ↓
Compaction proceeds (but learnings are preserved)
```

**Post-Compaction Context Restoration:**

After compaction, the post-compact hook restores context using multiple parallel strategies:

```
Compaction Complete → Stop Hook Fires
    ↓
Detects recent compaction (checks debug log)
    ↓
Parallel fetch:
  1. Mental model (project-summary) → instant cached overview
  2. Tag-based recall: ['decision'] → recent decisions
  3. Tag-based recall: ['mistake'] → mistakes to avoid
  4. Tag-based recall: ['correction'] → corrections made
  5. Reflect (budget: high) → synthesized context restoration
    ↓
Injects <restored-context> into conversation
    ↓
AI continues with critical context preserved
```

**Session Start — Context Loading:**

```
Session Starts → SessionStart Hook Fires
    ↓
Parallel fetch:
  1. Mental model (project-summary) → instant project overview
  2. Project recall (budget: low, types: [observation, experience])
  3. Personal recall (budget: low) → preferences, background
    ↓
Formats as <project-context> block
    ↓
AI starts with full context from day one
```

**Memory-First Debugging Protocol:**

The pack instructs the AI to:

1. **Check mental models first** - Instant cached answers before searching
2. **Use tag-filtered recall** - Search for similar past mistakes by tag
3. **Reflect for patterns** - Synthesize insights from past debugging sessions
4. **Store with tags** - Retain corrections tagged for future retrieval

**Memory Operations:**

| Operation | Purpose | Key Parameters |
|-----------|---------|----------------|
| **Recall** | Search past memories | `budget`, `tags`, `types` |
| **Retain** | Store new information | `tags`, `timestamp`, `document_id` |
| **Reflect** | Synthesize insights | `budget`, `context`, `response_schema` |
| **Mental Models** | Pre-cached reflect responses | Auto-refresh after consolidation |

---

## Why This Is Different

This sounds similar to conversation history which also preserves context. What makes this approach different?

Hindsight provides semantic memory, not just conversation logs. It understands relationships between facts, supports temporal queries, and synthesizes patterns across many sessions. Conversation logs are append-only transcripts; Hindsight builds a queryable knowledge graph with observations, mental models, and entity relationships.

- **Mental models** provide instant pre-cached answers without searching
- **Observations** automatically consolidate raw facts into higher-level knowledge
- **Tagged memories** enable precise filtered recall (only decisions, only mistakes, etc.)
- **Agentic reflect** synthesizes insights across all memory types with configurable depth
- **Bank disposition** shapes how the AI interprets and reasons about memories
- **Separate banks** isolate project-specific from personal knowledge
- **Automatic hooks** capture context without any manual effort

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              PAI System                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ SessionStart │ │  PreCompact  │ │ PostCompact  │ │  SessionEnd  │    │
│  │  + mental    │ │  + insight   │ │  + tag recall│ │  + tags      │    │
│  │    models    │ │    extractor │ │  + reflect   │ │  + doc_id    │    │
│  │  + budget    │ │  + batch     │ │  + mental    │ │  + doc_tags  │    │
│  │  + types     │ │    retain    │ │    models    │ │              │    │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘    │
│         │                │                │                │             │
│         ▼                ▼                ▼                ▼             │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                       Memory Skill                                │   │
│  │  ┌────────┐ ┌────────┐ ┌─────────┐ ┌──────────────┐ ┌─────────┐ │   │
│  │  │ Recall │ │ Retain │ │ Reflect │ │ MentalModels │ │Configure│ │   │
│  │  │+budget │ │+tags   │ │+context │ │   (CRUD)     │ │  Bank   │ │   │
│  │  │+tags   │ │+doc_id │ │+schema  │ │              │ │         │ │   │
│  │  │+types  │ │+stamp  │ │+budget  │ │              │ │         │ │   │
│  │  └───┬────┘ └───┬────┘ └────┬────┘ └──────┬───────┘ └────┬────┘ │   │
│  └──────┼──────────┼──────────┼──────────────┼──────────────┼──────┘   │
│         └──────────┼──────────┼──────────────┼──────────────┘          │
│                    ▼          ▼              ▼                          │
└────────────────────┼──────────┼──────────────┼──────────────────────────┘
                     ▼          ▼              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    Hindsight API (v0.4.0+)                                │
├──────────────────────────────┬───────────────────────────────────────────┤
│    hindsight-project (MCP)   │       hindsight-hedley (MCP)              │
│    (per-project bank)        │       (personal bank)                     │
│                              │                                           │
│  Mission: project context    │  Mission: personal memory                 │
│  Disposition: 4/4/2          │  Disposition: 2/2/4                       │
│                              │                                           │
│  Mental Models:              │  Mental Models:                           │
│  - project-summary           │  - about-me                              │
│  - coding-conventions        │  - my-goals                              │
│  - known-issues              │                                           │
│  - deployment-checklist      │  Directives:                              │
│                              │  - accuracy-first                         │
│  Directives:                 │                                           │
│  - accuracy-first            │  Tags: context, preference, goal,         │
│                              │        correction                         │
│  Tags: decision, mistake,    │                                           │
│        correction, context,  │                                           │
│        session, session-     │                                           │
│        insight               │                                           │
└──────────────────────────────┴───────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

| Variable | Default | Scope | Description |
|----------|---------|-------|-------------|
| `HINDSIGHT_PROJECT_URL` | `http://localhost:8889` | Global | Hindsight API server URL |
| `HINDSIGHT_PERSONAL_BANK` | `hedley` | Global | Bank name for personal memories |
| `HINDSIGHT_PROJECT` | `project` | **Per-project** | Bank name for project-specific memories |
| `PAI_DIR` | `~/.config/pai` | Global | PAI installation directory |
| `LOCAL_LLM_URL` | `http://uber.lan:11434` | Global | Local LLM for insight extraction |
| `LOCAL_LLM_MODEL` | `Qwen/Qwen2.5-32B-Instruct-GPTQ-Int4` | Global | Model for local LLM extraction |
| `ANTHROPIC_API_KEY` | (none) | Global | Fallback if local LLM unavailable |
| `LOCAL_LLM_TIMEOUT` | `600000` | Global | Timeout for LLM calls (ms) |
| `VOICE_PORT` | `8888` | Global | Port for notification server (optional) |

**Important:** `HINDSIGHT_PROJECT` should change per project. Set it in your shell environment, `.envrc` (with direnv), or per-project config. Global variables like `HINDSIGHT_PROJECT_URL` and `HINDSIGHT_PERSONAL_BANK` go in `settings.json`.

### MCP Server Configuration

Your project's `.mcp.json` must include the Hindsight MCP servers:

```json
{
  "mcpServers": {
    "hindsight-project": {
      "type": "http",
      "url": "http://localhost:8889/mcp/your-project-bank/"
    },
    "hindsight-hedley": {
      "type": "http",
      "url": "http://localhost:8889/mcp/hedley/"
    }
  }
}
```

### Bank Bootstrap

After installation, run the bootstrap script to configure bank mission, disposition, mental models, and directives:

```bash
bun run src/scripts/bootstrap-banks.ts --project pai --personal hedley
```

Use `--dry-run` to preview without making changes:

```bash
bun run src/scripts/bootstrap-banks.ts --project pai --personal hedley --dry-run
```

The bootstrap script is idempotent — it checks for existing mental models and directives before creating new ones.

**What bootstrap configures:**

| Component | Project Bank | Personal Bank |
|-----------|-------------|---------------|
| Mission | Project context tracking | Personal memory and cross-project learnings |
| Disposition | Skepticism: 4, Literalism: 4, Empathy: 2 | Skepticism: 2, Literalism: 2, Empathy: 4 |
| Mental Models | project-summary, coding-conventions, known-issues, deployment-checklist | about-me, my-goals |
| Directives | accuracy-first | accuracy-first |

---

## Tag Taxonomy

Tags enable filtered recall — query only the memory types you need.

### Project Bank Tags

| Tag | Applied By | Purpose |
|-----|-----------|---------|
| `decision` | Insight extractor | Architectural and design decisions |
| `mistake` | Insight extractor | Bugs, errors, wrong approaches |
| `correction` | Insight extractor | Fixes applied to mistakes |
| `context` | Insight extractor | Important background context |
| `session` | Session save hook | Full session summaries |
| `session-YYYY-MM-DD` | Session save hook | Date-specific session filtering |
| `session-insight` | Insight extractor | Document-level tag for insight batches |

### Personal Bank Tags

| Tag | Applied By | Purpose |
|-----|-----------|---------|
| `context` | Manual retain | General personal context |
| `preference` | Manual retain | User preferences |
| `goal` | Manual retain | Goals and aspirations |
| `correction` | Manual retain | Corrections to personal facts |

## Customization

### Bank Names

Change `HINDSIGHT_PROJECT` per project:
```bash
export HINDSIGHT_PROJECT=myproject
```

Change `HINDSIGHT_PERSONAL_BANK` if you use a different name:
```bash
export HINDSIGHT_PERSONAL_BANK=personal
```

### Mental Models

Add project-specific mental models via the ManageMentalModels workflow or the Hindsight API:

```bash
curl -X POST "http://localhost:8889/v1/default/banks/myproject/mental-models" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "api-patterns",
    "source_query": "What API patterns, conventions, and endpoint structures does this project use?",
    "tags": ["project", "api"],
    "trigger": {"refresh_after_consolidation": true}
  }'
```

### Hook Behavior

Modify `src/hooks/hindsight-session-save.ts` to:
- Change minimum activity threshold for saving sessions
- Add/remove fields captured from transcripts
- Adjust session summary format

Modify `src/hooks/lib/insight-extractor.ts` to:
- Adjust the tag taxonomy
- Change the LLM used for extraction
- Modify the extraction prompt

---

## Credits

- **Hindsight**: [vectorize.io](https://hindsight.vectorize.io/)
- **PAI System**: Daniel Miessler

## Related Work

- Hindsight documentation: https://hindsight.vectorize.io/
- MCP (Model Context Protocol): https://modelcontextprotocol.io/

## Works Well With

- `pai-history-system` - Complements with session logging
- `pai-core-install` - Core PAI infrastructure

## Changelog

### 2.0.0 - 2026-02-14
Major update leveraging Hindsight v0.4.0+ features (mental models, observations, agentic reflect).

**Hooks:**
- Session start: mental model queries, budget tuning (`low`), types filter (`observation`, `experience`), bank mission on creation
- Session save: per-memory tags (`session`, `session-YYYY-MM-DD`), `document_id` deduplication, `document_tags`
- Pre-compact / insight extractor: batch retain with per-insight tags (`decision`, `mistake`, `correction`, `context`), individual items instead of monolithic narrative
- Post-compact: tag-based recall replacing regex parsing, parallel mental model + reflect + tag recall, `budget: high` for deep context restoration

**Skill & Workflows:**
- New workflow: ManageMentalModels (CRUD for pre-cached mental models)
- New workflow: ConfigureBank (mission, disposition, directives via HTTP API)
- Enhanced Recall workflow: budget selection, tag filtering, type filtering, mental model check
- Enhanced Retain workflow: tag taxonomy, timestamp guidance, tag selection guide
- Enhanced Reflect workflow: structured output (`response_schema`), context parameter, tag-constrained reflection
- SKILL.md: mental model awareness, priority hierarchy (Mental Model > Recall > Reflect), tag taxonomy reference

**Scripts:**
- New: `bootstrap-banks.ts` — one-time bank setup with idempotency checks for mental models and directives

**Bug Fixes:**
- Fixed trailing slash on API paths causing 307 redirect to 404 (Hindsight API strict about no trailing slashes)
- Fixed `document_id` in session save to prevent duplicates on session resume
- Added `cleanPath` utility to strip trailing slashes in all API calls

### 1.1.0 - 2026-01-16
- Added post-compact hook for context restoration after compaction
- Added Memory-First Debugging Protocol to CORE skill
- Pre/post compaction now form a complete context preservation pipeline
- Updated architecture diagram to show all four hooks

### 1.0.0 - 2026-01-14
- Initial release
- Memory skill with Recall, Retain, Reflect, ManageBanks workflows
- Session save hook for automatic context capture
- Session start hook for context loading
- Dual-bank architecture (project vs personal)
