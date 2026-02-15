# Retain Workflow

Store important information to long-term memory.

## When to Use This Workflow

**Proactively retain when the user shares:**
- Personal facts, preferences, or interests
- Project decisions or architectural choices
- Important events or milestones
- Goals, plans, or future intentions
- Technical preferences or stack choices
- Contact information or relationships

## Execution Steps

### Step 1: Identify Information Type

Analyze what the user wants to remember:

| Type | Bank | Context Category |
|------|------|-----------------|
| Project architecture decisions | hindsight-project | architecture |
| Bug fixes and their causes | hindsight-project | debugging |
| Feature implementations | hindsight-project | features |
| Code patterns used | hindsight-project | patterns |
| Personal preferences | hindsight-hedley | preferences |
| Career/life goals | hindsight-hedley | goals |
| Contact information | hindsight-hedley | contacts |
| Tools/stack preferences | hindsight-hedley | stack |

### Step 2: Craft the Memory Content

Write a clear, specific memory that includes:
- **What**: The fact or decision
- **Why**: Rationale if applicable
- **When**: Date/time context if relevant
- **Where**: Project/location context

**Good memory format:**
```
"Decided to use PostgreSQL for the user service database because of:
1. Strong JSONB support for flexible schemas
2. Team familiarity with Postgres
3. Better performance for read-heavy workloads
Date: 2026-01-14"
```

### Step 3: Select Tags

**Always tag your memories.** Tags enable precise filtering on recall.

| Category | Tags to Apply |
|----------|---------------|
| **Decisions** | `decision` + domain tag (`architecture`, `database`, `api`, `security`, `deployment`) |
| **Learnings** | `learned` + domain tag (`debugging`, `performance`, `testing`) |
| **Mistakes** | `mistake` + domain tag |
| **Corrections** | `correction` + domain tag |
| **Infrastructure** | `deployment`, `config`, `docker`, `ci-cd` |
| **Preferences** | `preference` + domain (`editor`, `tools`, `style`) |
| **People/Contacts** | `contact`, `person` |

### Step 4: Store the Memory

**For project memories:**
```
Use tool: mcp__hindsight-project__retain
Parameters:
  content: [detailed memory content]
  context: [category: architecture, debugging, features, etc.]
  timestamp: "2026-02-14T15:00:00Z"  (ISO 8601 - always include!)
```

**For personal memories:**
```
Use tool: mcp__hindsight-hedley__retain
Parameters:
  content: [detailed memory content]
  context: [category: preferences, goals, contacts, etc.]
  timestamp: "2026-02-14T15:00:00Z"  (ISO 8601 - always include!)
```

### Step 5: Confirm Storage

After storing, confirm to the user:
- What was stored
- Which bank it was stored in
- The context category and tags used

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

## Context Categories

**For hindsight-project:**
- `architecture` - Design decisions, patterns
- `debugging` - Bug causes and fixes
- `features` - Feature requirements, implementations
- `dependencies` - Library choices, versions
- `configuration` - Setup, environment configs
- `testing` - Test strategies, coverage decisions
- `performance` - Optimization decisions
- `security` - Security considerations

**For hindsight-hedley:**
- `preferences` - Personal coding preferences
- `stack` - Technology preferences
- `goals` - Career and personal goals
- `contacts` - People and relationships
- `work` - Job context, responsibilities
- `hobbies` - Personal interests
- `health` - Health-related reminders
- `general` - Miscellaneous

## Timestamp Format (CRITICAL)

**Always pass `timestamp` in ISO 8601 format.** This enables Hindsight's temporal queries (date ranges, "last week", "before March").

- Use the current time unless the event clearly happened at a different time
- Hindsight tracks dual timestamps: event time (your `timestamp`) and retention time (automatic)

## Examples

**Store project decision with tags:**
```
User: "Remember that we're using Redis for session storage"
-> mcp__hindsight-project__retain
   content: "Decided to use Redis for session storage in this project. Chosen for fast read/write performance and built-in TTL support for session expiration."
   context: "architecture"
   timestamp: "2026-02-14T15:00:00Z"
```

**Store personal preference:**
```
User: "I prefer dark mode in all my tools"
-> mcp__hindsight-hedley__retain
   content: "Hedley prefers dark mode/themes in all development tools, editors, and IDEs."
   context: "preferences"
   timestamp: "2026-02-14T15:00:00Z"
```

**Store a learning:**
```
After discovering something through trial-and-error:
-> mcp__hindsight-project__retain
   content: "LEARNED: Port 8889 is the Hindsight API server, not 8888. Port 8888 is the voice notification server."
   context: "learning"
   timestamp: "2026-02-14T15:30:00Z"
```
