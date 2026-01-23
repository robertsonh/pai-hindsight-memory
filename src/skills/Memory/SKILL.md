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

## Proactive Recall Protocol (CRITICAL)

**BEFORE starting tasks, CHECK MEMORY FIRST.** Don't rediscover what you already know.

### Always Recall Before

| Task Type | Query Example |
|-----------|---------------|
| **Deployments** | "deployment steps, commands, and endpoints for [service]" |
| **API calls** | "API paths, endpoints, and authentication for [service]" |
| **Configuration** | "configuration, ports, environment variables for [service]" |
| **Infrastructure** | "infrastructure setup, Docker, cloud resources for [project]" |
| **Build/Test** | "build commands, test commands, CI/CD for [project]" |

### How to Recall

```
mcp__hindsight-project__recall
Query: "[task type] for [service/component name]"
```

### Examples

**Before deploying:**
```
mcp__hindsight-project__recall
Query: "deployment commands and endpoints for fast-classifier service"
```

**Before calling an API:**
```
mcp__hindsight-project__recall
Query: "API paths and authentication for rag-agent-service"
```

**Before configuring:**
```
mcp__hindsight-project__recall
Query: "Docker configuration and ports for Hindsight"
```

**Rationale:** Every `--help` command, every trial-and-error cycle, every "let me find that endpoint again" wastes time. The knowledge exists in memory - use it.

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
Content: "LEARNED (YYYY-MM-DD HH:MM): [what I tried that failed] → [what actually works]. Usage: [correct syntax/workflow]"
Context: "learning"
```

### Timestamp Format (IMPORTANT)

**Always include date and time in stored memories.** This populates Hindsight's timeline view.

- Use format: `CATEGORY (YYYY-MM-DD HH:MM): content...`
- Use current date/time unless the event clearly happened at a different time
- Examples:
  - `LEARNED (2026-01-21 17:30): Port 8889 is Hindsight API`
  - `DEPLOYMENT (2026-01-21 14:15): Deployed to production`
  - `DECISION (2026-01-15 10:00): Chose PostgreSQL over MongoDB` (past date if known)

**Examples of what to store:**
- CLI command syntax: "LEARNED (2026-01-21 17:30): `openspec new` requires subcommand → Correct: `openspec new change <name>`"
- API patterns: "LEARNED (2026-01-21 17:30): This API returns paginated results → Must handle pagination"
- Tool workflows: "LEARNED (2026-01-21 17:30): Must run `bun install` before `bun run build`"
- Configuration: "LEARNED (2026-01-21 17:30): Port 8889 is Hindsight API, not 8888"

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

