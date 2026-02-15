# ManageMentalModels Workflow

Manage Hindsight Mental Models — pre-computed, auto-refreshing answers for frequently asked questions.

## What Are Mental Models?

Mental Models are saved reflect responses that Hindsight caches and can auto-refresh when new knowledge is retained. They provide **instant answers** to common queries without running a full recall+reflect cycle each time.

Think of them as "living summaries" — they stay current as your memory bank grows.

## When to Use This Workflow

- "Create a project summary" / "set up mental models"
- "Refresh the project summary" / "update mental models"
- "What mental models exist?" / "list mental models"
- "Delete the deployment checklist model"
- Setting up a new project bank for the first time

## Recommended Default Mental Models

When setting up a project, create these mental models:

| Name | Source Query | Purpose |
|------|-------------|---------|
| `project-summary` | "What is this project, its architecture, key decisions, and current state?" | Instant project overview at session start |
| `coding-conventions` | "What coding conventions, patterns, and preferences apply to this project?" | Style consistency |
| `deployment-checklist` | "What are the deployment steps, configurations, and gotchas?" | Safe deployments |
| `known-issues` | "What known bugs, limitations, and workarounds exist?" | Avoid re-discovering issues |

## Operations

### Create a Mental Model

```
Use tool: mcp__hindsight-project__create_mental_model
Parameters:
  name: "project-summary"
  source_query: "What is this project, its architecture, key decisions, and current state?"
  tags: ["project", "summary"]
  max_tokens: 4096
```

The mental model will be generated asynchronously. Use `list_mental_models` to check when it's ready.

### List Mental Models

```
Use tool: mcp__hindsight-project__list_mental_models
Parameters:
  tags: ["project"]  (optional - filter by tags)
```

### Get a Mental Model (Read Full Content)

```
Use tool: mcp__hindsight-project__get_mental_model
Parameters:
  mental_model_id: [id from list]
```

Returns the full pre-computed content — use this instead of recall when you need a comprehensive overview.

### Refresh a Mental Model

```
Use tool: mcp__hindsight-project__refresh_mental_model
Parameters:
  mental_model_id: [id from list]
```

Re-runs the source query against current knowledge. Use after significant new information has been retained.

### Update a Mental Model

```
Use tool: mcp__hindsight-project__update_mental_model
Parameters:
  mental_model_id: [id from list]
  name: "updated-name"  (optional)
  source_query: "updated query"  (optional)
  tags: ["updated", "tags"]  (optional)
  max_tokens: 8192  (optional)
```

### Delete a Mental Model

```
Use tool: mcp__hindsight-project__delete_mental_model
Parameters:
  mental_model_id: [id from list]
```

## Auto-Refresh

Mental Models can auto-refresh after observation consolidation (when Hindsight processes new retained content into observations). This keeps summaries current without manual intervention.

## Bank Selection

- **hindsight-project**: Project-specific mental models (architecture, deployment, conventions)
- **hindsight-hedley**: Personal mental models (work patterns, preferences, goals summary)

## Examples

**Set up a new project's mental models:**
```
User: "Set up mental models for this project"
-> Create 4 default mental models:
   1. mcp__hindsight-project__create_mental_model(name: "project-summary", ...)
   2. mcp__hindsight-project__create_mental_model(name: "coding-conventions", ...)
   3. mcp__hindsight-project__create_mental_model(name: "deployment-checklist", ...)
   4. mcp__hindsight-project__create_mental_model(name: "known-issues", ...)
-> Confirm creation and note they'll be ready shortly
```

**Get instant project overview:**
```
User: "Give me a project overview"
-> mcp__hindsight-project__list_mental_models()
-> Find "project-summary" model
-> mcp__hindsight-project__get_mental_model(mental_model_id: ...)
-> Return the pre-computed summary (much faster than recall+reflect)
```

**Refresh after major changes:**
```
User: "We just finished a major refactor, refresh the project summary"
-> mcp__hindsight-project__list_mental_models()
-> Find "project-summary" model
-> mcp__hindsight-project__refresh_mental_model(mental_model_id: ...)
-> Confirm refresh initiated
```
