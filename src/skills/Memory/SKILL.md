---
name: Memory
description: AI memory management using Hindsight MCP. USE WHEN remember, recall, memory, memories, what do you know, what did we discuss, save this, retain this, store information, reflect on, analyze patterns, project context, past sessions, mental model, mental models, configure bank, directives.
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
| **ManageMentalModels** | "mental model", "create summary", "project overview", "refresh summary" | `Workflows/ManageMentalModels.md` |
| **ConfigureBank** | "configure bank", "set disposition", "add directive", "bank mission" | `Workflows/ConfigureBank.md` |

## Mental Models — Check Before Recall

**Before running recall for overview questions, check if a Mental Model exists.**

Mental Models are pre-computed, cached reflect responses that provide instant answers to common questions like:
- "What is this project's architecture?"
- "How do we deploy?"
- "What conventions do we follow?"

```
mcp__hindsight-project__list_mental_models
-> If "project-summary" exists, use get_mental_model instead of recall
```

Mental Models auto-refresh when new knowledge is consolidated. They're faster and more coherent than raw recall for overview queries.

## Proactive Recall Protocol (CRITICAL)

**BEFORE starting tasks, CHECK MEMORY FIRST.** Don't rediscover what you already know.

### Priority: Mental Model > Recall > Reflect

1. **Mental Model** — Instant pre-computed answer (check first)
2. **Recall** — Search raw facts and observations
3. **Reflect** — Synthesized reasoning (slower but deeper)

### Trigger Words - MUST Recall Before Proceeding

When you see ANY of these words in a task, **STOP and recall first**:

| Category | Trigger Words |
|----------|---------------|
| **Infrastructure** | deploy, docker, compose, container, kubernetes, k8s, helm, terraform |
| **Configuration** | config, configuration, environment, env, settings, .env, yaml, yml |
| **Build/CI** | build, ci, cd, pipeline, workflow, github actions, jenkins |
| **Database** | database, db, migration, schema, postgres, mysql, mongodb |
| **API/Server** | endpoint, route, api, server, service, port, host |
| **Files to Create** | dockerfile, docker-compose, makefile, package.json, tsconfig |

### NEVER DO THIS

**These actions WITHOUT recalling first are FORBIDDEN:**

- **NEVER** create new `docker-compose.yaml`, `compose.yaml`, or `Dockerfile` without first recalling existing infrastructure
- **NEVER** create new configuration files (`.env`, `config.yaml`, etc.) without checking if one already exists
- **NEVER** assume you know the deployment process - recall it first
- **NEVER** create new infrastructure from scratch when modifying existing systems
- **NEVER** guess at ports, endpoints, or environment variables - they are stored in memory
- **NEVER** run `--help` on a tool you've used before without checking memory first
- **NEVER** start a deployment without recalling the deployment checklist
- **NEVER** modify CI/CD workflows without recalling the existing pipeline structure

**If you catch yourself about to do any of the above, STOP and recall.**

### Always Recall Before

| Task Type | Query Example | Recommended Tags |
|-----------|---------------|-----------------|
| **Deployments** | "deployment steps and endpoints for [service]" | `deployment`, `config` |
| **API calls** | "API paths and authentication for [service]" | `api`, `config` |
| **Configuration** | "configuration, ports, environment variables for [service]" | `config`, `deployment` |
| **Infrastructure** | "infrastructure setup, Docker, cloud resources" | `docker`, `deployment` |
| **Build/Test** | "build commands, test commands, CI/CD" | `ci-cd`, `testing` |
| **Debugging** | "known issues and past mistakes with [component]" | `mistake`, `debugging` |

### How to Recall

```
mcp__hindsight-project__recall
  query: "[task type] for [service/component name]"
  tags: ["relevant", "tags"]  (optional but recommended)
  budget: "high"  (for critical operations like deployment)
```

---

## Tag Taxonomy Reference

### Project Bank Tags

| Domain | Tags |
|--------|------|
| Architecture | `decision`, `architecture`, `database`, `api`, `security` |
| Development | `feature`, `bugfix`, `refactor`, `patterns` |
| Infrastructure | `deployment`, `config`, `docker`, `ci-cd`, `monitoring` |
| Quality | `testing`, `performance`, `debugging` |
| Session | `session`, `session-insight`, `pre-compact` |
| Learning | `learned`, `mistake`, `correction`, `context` |

### Personal Bank Tags

| Domain | Tags |
|--------|------|
| Identity | `preference`, `identity`, `background` |
| Technical | `stack`, `tools`, `editor`, `style` |
| People | `contact`, `person`, `relationship` |
| Life | `goal`, `health`, `hobby`, `travel` |
| Work | `work`, `career`, `project` |

---

## Quick Reference

### Recall (Search)
```
Use mcp__hindsight-project__recall for project-specific memories
Use mcp__hindsight-hedley__recall for personal memories
Parameters: query, max_tokens, budget, tags, types
```

### Retain (Store)
```
Use mcp__hindsight-project__retain for project facts
Use mcp__hindsight-hedley__retain for personal facts
Parameters: content, context, timestamp (always include!)
```

### Reflect (Analyze)
```
Use mcp__hindsight-project__reflect for project analysis
Use mcp__hindsight-hedley__reflect for personal analysis
Parameters: query, context, budget, tags, response_schema
```

### Mental Models (Pre-computed Answers)
```
Use mcp__hindsight-project__list_mental_models to find models
Use mcp__hindsight-project__get_mental_model for instant answers
Use mcp__hindsight-project__create_mental_model to create new ones
Use mcp__hindsight-project__refresh_mental_model to update
```

---

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
  content: "LEARNED (YYYY-MM-DD HH:MM): [what I tried that failed] -> [what actually works]. Usage: [correct syntax/workflow]"
  context: "learning"
  timestamp: "2026-02-14T15:00:00Z"
```

### Timestamp Format (IMPORTANT)

**Always include date and time in stored memories.** This populates Hindsight's timeline view and enables temporal queries.

- Use ISO 8601 format for the `timestamp` parameter
- Include date/time in the content too for human readability
- Use current date/time unless the event clearly happened at a different time

---

## Examples

**Example 1: Search project memories with tags**
```
User: "What did we decide about authentication in this project?"
-> Invokes Recall workflow
-> mcp__hindsight-project__recall
   query: "authentication decisions"
   tags: ["decision", "security"]
   budget: "mid"
```

**Example 2: Store a personal preference**
```
User: "Remember that I prefer TypeScript over JavaScript"
-> Invokes Retain workflow
-> mcp__hindsight-hedley__retain
   content: "Hedley prefers TypeScript over JavaScript for all projects"
   context: "preferences"
   timestamp: "2026-02-14T15:00:00Z"
```

**Example 3: Analyze project patterns**
```
User: "What architectural patterns have emerged in this project?"
-> Invokes Reflect workflow
-> mcp__hindsight-project__reflect
   query: "What architectural patterns and design decisions have been consistently applied?"
   context: "Planning a new module and want to maintain consistency"
   budget: "mid"
```

**Example 4: Get instant project overview**
```
User: "Give me a project overview"
-> Invokes ManageMentalModels workflow
-> mcp__hindsight-project__list_mental_models
-> mcp__hindsight-project__get_mental_model (if "project-summary" exists)
-> Falls back to reflect if no mental model
```
