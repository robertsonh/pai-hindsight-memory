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

### Step 3: Store the Memory

**For project memories:**
```
Use tool: mcp__hindsight-project__retain
Parameters:
  content: [detailed memory content]
  context: [category: architecture, debugging, features, etc.]
  async_processing: true
```

**For personal memories:**
```
Use tool: mcp__hindsight-hedley__retain
Parameters:
  content: [detailed memory content]
  context: [category: preferences, goals, contacts, etc.]
  async_processing: true
```

### Step 4: Confirm Storage

After storing, confirm to the user:
- What was stored
- Which bank it was stored in
- The context category used

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

## Examples

**Store project decision:**
```
User: "Remember that we're using Redis for session storage"
-> mcp__hindsight-project__retain
   content: "Using Redis for session storage in this project. Chosen for fast read/write performance and built-in TTL support for session expiration."
   context: "architecture"
```

**Store personal preference:**
```
User: "I prefer dark mode in all my tools"
-> mcp__hindsight-hedley__retain
   content: "Hedley prefers dark mode/themes in all development tools, editors, and IDEs."
   context: "preferences"
```
