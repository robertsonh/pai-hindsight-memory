# Recall Workflow

Search memories to provide context-aware responses.

## Before Recall: Check Mental Models

If the question is a common overview question ("what's the architecture?", "how do we deploy?"), check for a Mental Model first — it provides an instant, pre-computed answer:

```
mcp__hindsight-project__list_mental_models
-> If a relevant model exists, use get_mental_model instead of recall
```

Mental Models are faster and more coherent than raw recall for overview questions.

## Execution Steps

### Step 1: Determine Query, Bank, Budget, and Filters

Analyze the user's request to determine:

1. **Search query** - What they want to find (natural language)
2. **Target bank** - Project-specific or personal
3. **Budget** - How thorough the search should be
4. **Tags** - Filter by category for precise results
5. **Types** - Filter by fact type

**Bank Selection:**
- **hindsight-project**: Current project context, codebase decisions, project-specific info
- **hindsight-hedley**: Personal preferences, contacts, life events, cross-project info

**Budget Selection:**

| Budget | When to Use | Latency |
|--------|-------------|---------|
| `low` | Quick facts during active work, session start | ~100-300ms |
| `mid` | Standard retrieval (default) | ~300-600ms |
| `high` | Critical operations: deployment, debugging, post-compaction | ~400-800ms |

**Tag Filtering:**

| Category | Tags | When |
|----------|------|------|
| Decisions | `decision`, `architecture` | "What did we decide about X?" |
| Mistakes | `mistake` | "What mistakes should I avoid?" |
| Corrections | `correction` | "What was corrected?" |
| Learnings | `learned`, `debugging` | "What did we learn about X?" |
| Infrastructure | `deployment`, `config`, `docker`, `ci-cd` | "How do we deploy?" |
| Sessions | `session`, `session-insight` | "What happened in recent sessions?" |

**Type Filtering:**

| Type | What It Returns | When |
|------|----------------|------|
| `observation` | Consolidated patterns and knowledge | Best for "what patterns exist?" |
| `experience` | Specific interactions and sessions | Best for "what happened when?" |
| `world` | Facts about external entities | Best for "what is X?" |

### Step 2: Search Memories

**For project memories:**
```
Use tool: mcp__hindsight-project__recall
Parameters:
  query: [natural language search query]
  max_tokens: 4096 (increase for research queries: 8192)
  budget: "low" | "mid" | "high"
  tags: ["decision", "architecture"]  (optional - filter by tags)
  types: ["observation"]  (optional - filter by fact type)
```

**For personal memories:**
```
Use tool: mcp__hindsight-hedley__recall
Parameters:
  query: [natural language search query]
  max_tokens: 4096
  budget: "low" | "mid"
```

### Step 3: Search Both Banks (When Unclear)

If the context is ambiguous, search BOTH banks:

1. First search hindsight-project
2. Then search hindsight-hedley
3. Combine and present relevant results

### Step 4: Present Results

Format response with:
- Source bank(s) searched
- Relevant memories found
- How the memories relate to the query

## Examples

**Project-specific query:**
```
User: "What database did we choose for this project?"
-> mcp__hindsight-project__recall
   query: "database choice"
   tags: ["decision", "architecture"]
   budget: "mid"
```

**Mistakes to avoid:**
```
User: "What mistakes should I avoid with the deployment?"
-> mcp__hindsight-project__recall
   query: "deployment mistakes and pitfalls"
   tags: ["mistake", "deployment"]
   budget: "high"
```

**Personal query:**
```
User: "What's my preferred code formatter?"
-> mcp__hindsight-hedley__recall
   query: "code formatter preference"
   budget: "low"
```

**Consolidated patterns:**
```
User: "What coding patterns do we use in this project?"
-> mcp__hindsight-project__recall
   query: "coding patterns and conventions"
   types: ["observation"]
   budget: "mid"
```

**Ambiguous query:**
```
User: "What do you know about testing?"
-> Search both banks
-> Combine: project test patterns + personal testing preferences
```
