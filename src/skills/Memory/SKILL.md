---
name: Memory
description: AI memory management using Hindsight MCP. USE WHEN remember, recall, memory, memories, what do you know, what did we discuss, save this, retain this, store information, reflect on, analyze patterns, project context, past sessions.
---

# Memory

Long-term memory management for AI assistants using Hindsight MCP servers.

## Memory Banks

PAI uses two Hindsight memory banks:

| Bank | Server | Purpose |
|------|--------|---------|
| **hindsight-project** | `mcp__hindsight-project__*` | Per-project memories (current working directory context) |
| **hindsight-{personal}** | `mcp__hindsight-{personal}__*` | Personal memories (not project-specific) |

> **Note:** The personal bank name is configurable via `HINDSIGHT_PERSONAL_BANK` env var (default: `hedley`).
> Your MCP server should match this name (e.g., `hindsight-hedley` or `hindsight-personal`).

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Recall** | "what do you remember", "search memories", "recall" | `Workflows/Recall.md` |
| **Retain** | "remember this", "save this", "store this fact" | `Workflows/Retain.md` |
| **Reflect** | "think about", "analyze patterns", "what patterns", "synthesize" | `Workflows/Reflect.md` |
| **ManageBanks** | "list banks", "create bank", "project memory" | `Workflows/ManageBanks.md` |

## Quick Reference

### Recall (Search)
```
Use mcp__hindsight-project__recall for project-specific memories
Use mcp__hindsight-hedley__recall for personal memories
```

### Retain (Store)
```
Use mcp__hindsight-project__retain for project facts
Use mcp__hindsight-hedley__retain for personal facts
```

### Reflect (Analyze)
```
Use mcp__hindsight-project__reflect for project analysis
Use mcp__hindsight-hedley__reflect for personal analysis
```

## Bank Selection Logic

**Use hindsight-project when:**
- Information relates to current codebase or project
- Architectural decisions for this project
- Bug fixes, features, refactors in this project
- Project-specific preferences or patterns

**Use hindsight-hedley when:**
- Personal preferences (coding style, tools)
- Contact information
- Goals, career, life events
- Information that transcends any single project

---

## Self-Learning Protocol (IMPORTANT)

**When you learn something through trial-and-error, STORE IT IMMEDIATELY.**

This applies when:
- You try a command/approach that fails, then find what works
- You need to use `--help` or docs to figure out correct syntax
- You discover the right workflow after multiple attempts
- You find a non-obvious solution to a problem

**Action:** After succeeding, immediately call:
```
mcp__hindsight-project__retain
Content: "LEARNED: [what I tried that failed] → [what actually works]. Usage: [correct syntax/workflow]"
Context: "learning"
```

**Examples of what to store:**
- CLI command syntax: "LEARNED: `openspec new` requires subcommand → Correct: `openspec new change <name>`"
- API patterns: "LEARNED: This API returns paginated results → Must handle pagination"
- Tool workflows: "LEARNED: Must run `bun install` before `bun run build`"
- Configuration: "LEARNED: Port 8889 is Hindsight API, not 8888"

**Why this matters:** Self-discovered knowledge is just as valuable as user corrections. Without storing it, you'll repeat the same trial-and-error in future sessions.

---

## Examples

**Example 1: Search project memories**
```
User: "What did we discuss about authentication in this project?"
-> Invokes Recall workflow
-> Searches hindsight-project with query "authentication"
-> Returns relevant project memories
```

**Example 2: Store a personal preference**
```
User: "Remember that I prefer TypeScript over JavaScript"
-> Invokes Retain workflow
-> Stores to hindsight-hedley (personal preference, not project-specific)
-> Confirms storage
```

**Example 3: Analyze project patterns**
```
User: "What architectural patterns have emerged in this project?"
-> Invokes Reflect workflow
-> Uses hindsight-project reflect with analysis query
-> Returns synthesized analysis
```

**Example 4: Save project decision**
```
User: "Remember we decided to use PostgreSQL for this project"
-> Invokes Retain workflow
-> Stores to hindsight-project (project-specific decision)
-> Confirms storage with context
```

