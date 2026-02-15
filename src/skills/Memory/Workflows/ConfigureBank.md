# ConfigureBank Workflow

Configure Hindsight memory bank settings: mission, disposition, and directives.

## What These Settings Do

| Setting | What It Affects | Persistence |
|---------|----------------|-------------|
| **Mission** | First-person narrative that shapes reflect reasoning context | Stored in bank |
| **Disposition** | Three traits (skepticism, literalism, empathy) that influence reflect interpretation | Stored in bank |
| **Directives** | Hard rules enforced in every reflect response | Stored in bank |

## Bank Mission

A first-person narrative that gives the bank its reasoning identity. Only affects `reflect` operations.

**Set mission via HTTP API** (banks must be configured via API, not MCP tools):

```bash
# Set project bank mission
curl -X PATCH http://192.168.86.81:8889/v1/default/banks/pai/ \
  -H "Content-Type: application/json" \
  -d '{
    "mission": "I am the memory for the PAI project. I track architecture decisions, debugging learnings, deployment procedures, code patterns, and session history. I prioritize accuracy and technical precision. When uncertain, I flag it explicitly."
  }'
```

### Example Missions

**Project bank:**
> "I am the memory for the [project] project. I track architecture decisions, debugging learnings, deployment procedures, code patterns, and session history. I prioritize accuracy and technical precision."

**Personal bank:**
> "I am the personal memory for Hedley. I track preferences, goals, contacts, life events, and cross-project learnings. I prioritize helpfulness and personal context."

## Disposition

Three traits on a 1-5 scale that shape how `reflect` interprets information.

| Trait | Low (1) | High (5) |
|-------|---------|----------|
| **Skepticism** | Trusts and accepts information | Questions and doubts claims |
| **Literalism** | Flexible interpretation, reads between lines | Exact, literal interpretation |
| **Empathy** | Detached, logic-focused analysis | Emotionally aware, considers feelings |

### Recommended Presets

| Bank Type | Skepticism | Literalism | Empathy | Rationale |
|-----------|-----------|-----------|---------|-----------|
| **Project bank** | 4 | 4 | 2 | Code-review-like: precise, critical, focused on correctness |
| **Personal bank** | 2 | 2 | 4 | Supportive: trusting, flexible, emotionally aware |
| **Security bank** | 5 | 5 | 1 | Maximum rigor, zero tolerance for ambiguity |
| **Research bank** | 4 | 3 | 3 | Balanced skepticism with interpretive flexibility |

**Set disposition via HTTP API:**

```bash
# Set project bank to code-review disposition
curl -X PATCH http://192.168.86.81:8889/v1/default/banks/pai/ \
  -H "Content-Type: application/json" \
  -d '{
    "disposition": {
      "skepticism": 4,
      "literalism": 4,
      "empathy": 2
    }
  }'

# Set personal bank to supportive disposition
curl -X PATCH http://192.168.86.81:8889/v1/default/banks/hedley/ \
  -H "Content-Type: application/json" \
  -d '{
    "disposition": {
      "skepticism": 2,
      "literalism": 2,
      "empathy": 4
    }
  }'
```

## Directives

Hard rules enforced in every `reflect` response. Unlike disposition (which shapes interpretation softly), directives are **non-negotiable constraints**.

### Create a Directive

```bash
curl -X POST http://192.168.86.81:8889/v1/default/banks/pai/directives/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "security-first",
    "content": "Always consider security implications when recommending approaches. Flag any potential vulnerabilities."
  }'
```

### List Directives

```bash
curl http://192.168.86.81:8889/v1/default/banks/pai/directives/
```

### Deactivate a Directive

```bash
curl -X PATCH http://192.168.86.81:8889/v1/default/banks/pai/directives/{directive_id} \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

### Delete a Directive

```bash
curl -X DELETE http://192.168.86.81:8889/v1/default/banks/pai/directives/{directive_id}
```

### Example Directives

**For project banks:**
- "Always consider backwards compatibility when suggesting API changes"
- "Flag any potential security vulnerabilities in recommended approaches"
- "Prefer established patterns already used in this project over introducing new ones"

**For personal banks:**
- "Remember that Hedley prefers bun over npm for all package management"
- "Dark mode is always preferred for tool recommendations"
- "When recommending tools, prioritize self-hosted/ownable solutions"

## Full Bank Setup Example

Set up a new project bank with mission, disposition, mental models, and directives:

```bash
# 1. Create/update bank with mission
curl -X PUT http://192.168.86.81:8889/v1/default/banks/project-myapp/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MyApp Project",
    "background": "Full-stack TypeScript application with Next.js frontend and Express API",
    "mission": "I am the memory for the MyApp project. I track all technical decisions, patterns, and learnings."
  }'

# 2. Set disposition
curl -X PATCH http://192.168.86.81:8889/v1/default/banks/project-myapp/ \
  -H "Content-Type: application/json" \
  -d '{"disposition": {"skepticism": 4, "literalism": 4, "empathy": 2}}'

# 3. Add directives
curl -X POST http://192.168.86.81:8889/v1/default/banks/project-myapp/directives/ \
  -H "Content-Type: application/json" \
  -d '{"name": "type-safety", "content": "Always recommend TypeScript-first approaches. Avoid any/unknown where possible."}'

# 4. Create mental models (see ManageMentalModels workflow)
```

## When to Use This Workflow

- Setting up a new project for the first time
- Tuning reflect behavior (results too trusting? increase skepticism)
- Adding project-specific constraints (directives)
- Changing bank personality for different use cases
