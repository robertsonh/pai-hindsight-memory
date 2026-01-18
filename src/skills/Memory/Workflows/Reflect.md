# Reflect Workflow

Generate thoughtful analysis by synthesizing stored memories.

## When to Use Reflect vs Recall

| Use Reflect When | Use Recall When |
|------------------|-----------------|
| Need reasoned analysis | Need fact retrieval |
| Want pattern synthesis | Want specific memories |
| Ask "what should I do?" | Ask "what did I say?" |
| Need strategic advice | Need historical facts |

**Reflect examples:**
- "What patterns have emerged in how I approach debugging?"
- "Based on my past decisions, what architectural style do I prefer?"
- "What might be the best approach given what you know about me?"

**Recall examples:**
- "What database did we choose?"
- "When did we implement authentication?"
- "What's my email address?"

## Execution Steps

### Step 1: Analyze the Question

Determine:
1. **Topic**: What area to reflect on
2. **Bank**: Project-specific or personal
3. **Depth**: Low, mid, or high budget

### Step 2: Set Reflection Budget

| Budget | Use When |
|--------|----------|
| `low` | Quick insights, simple questions |
| `mid` | Moderate analysis, pattern recognition |
| `high` | Deep analysis, comprehensive synthesis |

### Step 3: Execute Reflection

**For project reflection:**
```
Use tool: mcp__hindsight-project__reflect
Parameters:
  query: [analysis question]
  context: [why this reflection is needed - optional]
  budget: "low" | "mid" | "high"
```

**For personal reflection:**
```
Use tool: mcp__hindsight-hedley__reflect
Parameters:
  query: [analysis question]
  context: [why this reflection is needed - optional]
  budget: "low" | "mid" | "high"
```

### Step 4: Present Analysis

Format the reflection results:
- Key insights discovered
- Patterns identified
- Recommendations (if applicable)
- Confidence level of conclusions

## Combined Reflection

For holistic analysis, reflect on BOTH banks:

1. Reflect on project bank for technical patterns
2. Reflect on personal bank for preference patterns
3. Synthesize both into comprehensive response

## Examples

**Project architecture analysis:**
```
User: "What architectural patterns have we consistently used in this project?"
-> mcp__hindsight-project__reflect
   query: "What architectural patterns and design decisions have been consistently applied?"
   budget: "mid"
```

**Personal work style analysis:**
```
User: "How do I typically approach debugging problems?"
-> mcp__hindsight-hedley__reflect
   query: "What patterns exist in debugging approach and problem-solving methodology?"
   budget: "mid"
```

**Strategic recommendation:**
```
User: "Should we use GraphQL or REST for this new service?"
-> mcp__hindsight-project__reflect
   query: "Based on past API decisions and their outcomes, which API style would be most appropriate?"
   context: "Deciding between GraphQL and REST for a new microservice"
   budget: "high"
```

## Disposition Influence

Reflection results are influenced by bank disposition traits:
- **Skepticism** (1-5): How critically to evaluate evidence
- **Literalism** (1-5): How strictly to interpret facts
- **Empathy** (1-5): How much to consider emotional/human factors

These traits are set per bank and affect the reasoning style.
