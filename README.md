---
name: PAI Hindsight Memory
pack-id: hedley-pai-hindsight-memory-core-v1.1.0
version: 1.1.0
author: Hedley Robertson
description: Long-term memory integration using Hindsight MCP servers with automatic session context preservation across sessions
type: skill
purpose-type: [productivity, automation, memory]
platform: claude-code
dependencies: [hindsight-mcp-servers]
keywords: [memory, hindsight, mcp, sessions, context, recall, retain, reflect, banks]
icon: icons/pai-hindsight-memory.png
---

# PAI Hindsight Memory

> Long-term memory integration for PAI using Hindsight MCP servers - automatic context preservation across sessions with separate project and personal memory banks.

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#the-journey-pai-v1x--v20)

This pack integrates Hindsight memory servers with PAI to provide persistent memory across sessions. It enables your AI to:

- **Remember project context** automatically between sessions
- **Store and recall decisions** made during development
- **Reflect on patterns** from past work
- **Separate concerns** with project-specific vs personal memory banks

**Core principle:** Sessions end, but memory persists. Your AI picks up where you left off.

Please follow the installation instructions in INSTALL.md to integrate this pack.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Memory Skill | `src/skills/Memory/SKILL.md` | Manual memory operations |
| Recall Workflow | `src/skills/Memory/Workflows/Recall.md` | Search memories |
| Retain Workflow | `src/skills/Memory/Workflows/Retain.md` | Store memories |
| Reflect Workflow | `src/skills/Memory/Workflows/Reflect.md` | Analyze patterns |
| ManageBanks Workflow | `src/skills/Memory/Workflows/ManageBanks.md` | Bank management |
| Session Save Hook | `src/hooks/hindsight-session-save.ts` | Auto-save on exit |
| Session Start Hook | `src/hooks/hindsight-session-start.ts` | Load context on start |
| Pre-Compact Hook | `src/hooks/hindsight-pre-compact.ts` | Extract insights before compaction |
| Post-Compact Hook | `src/hooks/hindsight-post-compact.ts` | Restore context after compaction |

**Summary:**
- **Files created:** 9
- **Hooks registered:** 4
- **Dependencies:** Hindsight MCP servers (hindsight-project, hindsight-hedley)

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
Stores to hindsight-project memory bank
    ↓
Next session: context available via recall
```

**Pre-Compaction Analysis:**

When Claude's context window fills up and compaction is triggered, valuable context is lost. The pre-compact hook preserves important learnings:

```
Context Full → PreCompact Hook Fires
    ↓
Reads full conversation transcript
    ↓
LLM analyzes for: decisions, mistakes, corrections, key context
    ↓
Stores insights to hindsight-project
    ↓
Compaction proceeds (but learnings are preserved)
```

**Post-Compaction Context Restoration:**

After compaction, the post-compact hook restores key context:

```
Compaction Complete → Stop Hook Fires
    ↓
Detects recent compaction (checks debug log)
    ↓
Queries Hindsight for: decisions, mistakes, corrections, key context
    ↓
Injects <restored-context> into conversation
    ↓
AI continues with critical context preserved
```

This ensures that mistakes made early in a session aren't repeated after compaction, and important decisions are remembered.

**Memory-First Debugging Protocol:**

The pack also installs a debugging protocol in the CORE skill that instructs the AI to:

1. **Check memory before experimenting** - Query Hindsight for similar past mistakes
2. **Use reflect for pattern analysis** - Synthesize insights from past debugging sessions
3. **Store valuable fixes** - Retain corrections for future reference

This prevents wasteful trial-and-error when solutions are already known.

**Three Memory Operations:**

| Operation | Purpose | Use When |
|-----------|---------|----------|
| **Recall** | Search past memories | "What did we decide about X?" |
| **Retain** | Store new information | "Remember that we chose Y" |
| **Reflect** | Synthesize insights | "What patterns emerge from Z?" |

---

## Why This Is Different

This sounds similar to conversation history which also preserves context. What makes this approach different?

Hindsight provides semantic memory, not just conversation logs. It understands relationships between facts, supports temporal queries like "what happened last month?", and synthesizes patterns across many sessions. Conversation logs are append-only transcripts; Hindsight builds a queryable knowledge graph with confidence scores and entity relationships.

- Semantic search finds meaning across all past sessions
- Separate memory banks isolate project from personal facts
- Reflection synthesizes insights rather than just retrieving them
- Automatic hooks capture context without any manual effort

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           PAI System                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │SessionStart │  │ PreCompact  │  │ PostCompact │  │ SessionEnd  │  │
│  │   Hook      │  │   Hook      │  │   Hook      │  │   Hook      │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │
│         │                │                │                │          │
│         │    ┌───────────┴────────────────┘                │          │
│         │    │                                             │          │
│         ▼    ▼                                             ▼          │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                      Memory Skill                               │  │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │  │
│  │  │  Recall  │    │  Retain  │    │  Reflect │                  │  │
│  │  └────┬─────┘    └────┬─────┘    └────┬─────┘                  │  │
│  └───────┼───────────────┼───────────────┼────────────────────────┘  │
│          │               │               │                            │
└──────────┼───────────────┼───────────────┼────────────────────────────┘
           │               │               │
           ▼               ▼               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       Hindsight MCP Servers                           │
├─────────────────────────────────┬────────────────────────────────────┤
│      hindsight-project          │         hindsight-hedley           │
│      (per-project bank)         │         (personal bank)            │
│                                 │                                     │
│  - Decisions & Architecture     │  - Preferences                     │
│  - Mistakes to Avoid            │  - Stack choices                   │
│  - Corrections Made             │  - Goals                           │
│  - Key Context                  │  - Contacts                        │
└─────────────────────────────────┴────────────────────────────────────┘
```

---

## Configuration

Configuration is handled via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `HINDSIGHT_PROJECT` | `project` | Bank name for project-specific memories |
| `HINDSIGHT_PERSONAL_BANK` | `hedley` | Bank name for personal memories |
| `HINDSIGHT_PROJECT_URL` | `http://localhost:8889` | Hindsight API server URL |
| `PAI_DIR` | `~/.config/pai` | PAI installation directory |
| `VOICE_PORT` | `8888` | Port for notification server (optional) |

**Notification Server (Optional):**

If you have a voice/notification server running, the session start hook will send a status message:

```
🧠 Hindsight: 25 personal profile facts, 14 project memories | Bank: pai
```

Set `VOICE_PORT` to your server's port, or leave unset to skip notifications silently.

**MCP Server Configuration:**

Your `.mcp.json` or `~/.claude.json` must include the Hindsight MCP servers:

```json
{
  "mcpServers": {
    "hindsight-project": {
      "type": "http",
      "url": "http://localhost:8889/mcp/${HINDSIGHT_PROJECT:-project}/"
    },
    "hindsight-hedley": {
      "type": "http",
      "url": "http://localhost:8889/mcp/hedley/"
    }
  }
}
```

---

## Customization

### Recommended Customization

**Bank Names:** Change `HINDSIGHT_PROJECT` to match your project naming convention:
```bash
export HINDSIGHT_PROJECT=myproject
```

**Personal Bank:** Change `HINDSIGHT_PERSONAL_BANK` if you use a different name:
```bash
export HINDSIGHT_PERSONAL_BANK=personal
```

### Optional Customization

**Hook Behavior:** Modify `src/hooks/hindsight-session-save.ts` to:
- Change minimum activity threshold for saving sessions
- Add/remove fields captured from transcripts
- Adjust session summary format

**Memory Skill:** Modify `src/skills/Memory/SKILL.md` to:
- Add custom trigger phrases
- Change bank selection logic
- Add new workflows

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
