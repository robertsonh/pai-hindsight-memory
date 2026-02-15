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
4. **Context**: Why this reflection is needed (improves quality)
5. **Tags**: Constrain evidence gathering (optional)
6. **Structured output**: Whether you need typed JSON (optional)

### Step 2: Set Reflection Budget

| Budget | Use When | Reflect Iterations |
|--------|----------|--------------------|
| `low` | Quick insights, simple questions | 1-3 iterations |
| `mid` | Moderate analysis, pattern recognition | 3-6 iterations |
| `high` | Deep analysis, comprehensive synthesis | 6-10 iterations |

### Step 3: Execute Reflection

**For project reflection:**
```
Use tool: mcp__hindsight-project__reflect
Parameters:
  query: [analysis question]
  context: [why this reflection is needed - improves quality]
  budget: "low" | "mid" | "high"
  tags: ["architecture"]  (optional - constrain evidence)
```

**For personal reflection:**
```
Use tool: mcp__hindsight-hedley__reflect
Parameters:
  query: [analysis question]
  context: [why this reflection is needed]
  budget: "low" | "mid" | "high"
```

### Step 4: Present Analysis

Format the reflection results:
- Key insights discovered
- Patterns identified
- Recommendations (if applicable)
- Confidence level of conclusions

## Advanced: Structured Output

Use `response_schema` for typed JSON responses when you need machine-parseable results:

```
Use tool: mcp__hindsight-project__reflect
Parameters:
  query: "What architecture patterns do we use?"
  budget: "mid"
  response_schema: {
    "type": "object",
    "properties": {
      "patterns": { "type": "array", "items": { "type": "string" } },
      "confidence": { "type": "string", "enum": ["low", "medium", "high"] },
      "evidence_count": { "type": "integer" }
    },
    "required": ["patterns", "confidence", "evidence_count"]
  }
```

Structured output is useful for:
- Feeding reflect results into downstream processing
- Getting consistent, parseable responses
- Extracting specific data points from analysis

## Advanced: Tag-Constrained Reflection

Constrain what evidence reflect considers:

```
# Only reason about architecture decisions
reflect(query: "best database approach", tags: ["architecture", "decision"])

# Only reason about past mistakes
reflect(query: "what problems might we face?", tags: ["mistake", "debugging"])
```

## Advanced: Context Parameter

The `context` parameter tells reflect *why* you're asking, which significantly improves reasoning quality:

```
# Without context (less focused)
reflect(query: "database patterns")

# With context (more focused, better reasoning)
reflect(
  query: "database patterns",
  context: "We're choosing a database for a new microservice and want to learn from past decisions in this project"
)
```

## Combined Reflection

For holistic analysis, reflect on BOTH banks:

1. Reflect on project bank for technical patterns
2. Reflect on personal bank for preference patterns
3. Synthesize both into comprehensive response

## Disposition Influence

Reflection results are influenced by bank disposition traits:
- **Skepticism** (1-5): How critically to evaluate evidence
- **Literalism** (1-5): How strictly to interpret facts
- **Empathy** (1-5): How much to consider emotional/human factors

Configure these via the ConfigureBank workflow to tune reflect behavior per bank.

## Examples

**Project architecture analysis:**
```
User: "What architectural patterns have we consistently used in this project?"
-> mcp__hindsight-project__reflect
   query: "What architectural patterns and design decisions have been consistently applied?"
   context: "Planning a new module and want to maintain consistency"
   budget: "mid"
```

**Personal work style analysis:**
```
User: "How do I typically approach debugging problems?"
-> mcp__hindsight-hedley__reflect
   query: "What patterns exist in debugging approach and problem-solving methodology?"
   budget: "mid"
```

**Strategic recommendation with tags:**
```
User: "Should we use GraphQL or REST for this new service?"
-> mcp__hindsight-project__reflect
   query: "Based on past API decisions and their outcomes, which API style would be most appropriate?"
   context: "Deciding between GraphQL and REST for a new microservice"
   tags: ["decision", "api", "architecture"]
   budget: "high"
```
