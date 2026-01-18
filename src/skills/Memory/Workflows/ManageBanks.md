# ManageBanks Workflow

Manage Hindsight memory banks for projects and personal memories.

## Available Operations

| Operation | Tool | Purpose |
|-----------|------|---------|
| List banks | `mcp__hindsight-project__list_banks` or `mcp__hindsight-hedley__list_banks` | View all available banks |
| Create bank | `mcp__hindsight-project__create_bank` or `mcp__hindsight-hedley__create_bank` | Create new memory bank |

## Execution Steps

### List All Banks

To see all available memory banks:

```
Use tool: mcp__hindsight-project__list_banks
(No parameters needed)
```

Or:

```
Use tool: mcp__hindsight-hedley__list_banks
(No parameters needed)
```

Both servers share the same database, so either will show all banks.

### Create a New Bank

To create a new memory bank (e.g., for a new project):

```
Use tool: mcp__hindsight-project__create_bank
Parameters:
  bank_id: [unique identifier, e.g., "project-myapp"]
  name: [human-friendly name, e.g., "MyApp Project"]
  background: [context about the bank, e.g., "Memory bank for the MyApp e-commerce project"]
```

### Cross-Bank Operations

All memory tools support a `bank_id` parameter for cross-bank operations:

```
# Store to a specific project bank
mcp__hindsight-project__retain
  content: "Deployment uses Kubernetes on GCP"
  context: "infrastructure"
  bank_id: "project-myapp"  # Target specific bank

# Search a specific bank
mcp__hindsight-project__recall
  query: "deployment configuration"
  bank_id: "project-myapp"
```

## Bank Naming Conventions

| Bank Type | ID Pattern | Example |
|-----------|-----------|---------|
| Personal | `hedley` or `personal-*` | `hedley`, `personal-health` |
| Project | `project-{name}` | `project-pai`, `project-myapp` |
| Topic | `topic-{subject}` | `topic-ml-research` |

## Default Banks

The PAI system uses these default banks:

| Bank | Default Bank ID | Purpose |
|------|-----------------|---------|
| `hindsight-hedley` | Session default | Personal memories |
| `hindsight-project` | Session default | Current project memories |

## Examples

**List all banks:**
```
User: "What memory banks exist?"
-> mcp__hindsight-project__list_banks
-> Returns list of all banks with IDs and descriptions
```

**Create project bank:**
```
User: "Create a memory bank for the new API project"
-> mcp__hindsight-project__create_bank
   bank_id: "project-api-gateway"
   name: "API Gateway Project"
   background: "Memory bank for the API Gateway microservice project. Tech stack: Node.js, Express, PostgreSQL."
```

**Store to specific bank:**
```
User: "Save this architecture decision to the API project bank"
-> mcp__hindsight-project__retain
   content: "Using event-driven architecture with RabbitMQ for service communication"
   context: "architecture"
   bank_id: "project-api-gateway"
```
