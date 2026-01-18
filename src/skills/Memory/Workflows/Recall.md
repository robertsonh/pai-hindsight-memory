# Recall Workflow

Search memories to provide context-aware responses.

## Execution Steps

### Step 1: Determine Query and Bank

Analyze the user's request to determine:
1. **Search query** - What they want to find
2. **Target bank** - Project-specific or personal

**Bank Selection:**
- **hindsight-project**: Current project context, codebase decisions, project-specific info
- **hindsight-hedley**: Personal preferences, contacts, life events, cross-project info

### Step 2: Search Memories

**For project memories:**
```
Use tool: mcp__hindsight-project__recall
Parameters:
  query: [natural language search query]
  max_tokens: 4096 (increase if needed)
```

**For personal memories:**
```
Use tool: mcp__hindsight-hedley__recall
Parameters:
  query: [natural language search query]
  max_tokens: 4096 (increase if needed)
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
-> mcp__hindsight-project__recall with query "database choice"
```

**Personal query:**
```
User: "What's my preferred code formatter?"
-> mcp__hindsight-hedley__recall with query "code formatter preference"
```

**Ambiguous query:**
```
User: "What do you know about testing?"
-> Search both banks
-> Combine: project test patterns + personal testing preferences
```
