# Project Context

## Purpose

PAI Hindsight Memory is a PAI Pack that integrates Hindsight MCP servers with PAI to provide persistent memory across AI sessions. It enables context preservation, decision recall, and pattern synthesis through automatic session hooks and manual memory operations.

## Tech Stack

- TypeScript/Bun for hook implementations
- Hindsight MCP servers for memory storage
- Claude Code hooks API for session lifecycle integration
- Markdown for skill and workflow definitions

## Project Conventions

### Code Style

- TypeScript with strict mode enabled
- Bun runtime for all hook scripts
- Async/await patterns for all I/O operations
- Environment variables for configuration (no hardcoded values)

### Architecture Patterns

- Dual-bank architecture: project-specific vs personal memories
- Hook-based automation for session lifecycle events
- Workflow-based skill organization (Recall, Retain, Reflect, ManageBanks)
- MCP tool abstraction for memory operations

### Testing Strategy

- Manual verification via VERIFY.md checklist
- Hook testing with mock stdin input
- Integration testing with live Hindsight servers

### Git Workflow

- Main branch for stable releases
- Feature branches for new capabilities
- Conventional commits preferred
- Version bumps in README.md frontmatter and package.json

## Domain Context

- **Memory Banks**: Isolated memory stores for different contexts
- **Hindsight MCP**: Model Context Protocol servers providing recall, retain, reflect operations
- **Session Hooks**: Claude Code lifecycle events (SessionStart, SessionEnd, PreCompact, PostCompact)
- **PAI System**: Personal AI Infrastructure for modular AI agent capabilities

## Important Constraints

- Hooks must complete within Claude Code timeout limits
- Memory operations should be non-blocking (async_processing: true)
- Personal bank name is configurable via HINDSIGHT_PERSONAL_BANK env var
- MCP server names must match configured bank names

## External Dependencies

- Hindsight MCP servers (hindsight.vectorize.io)
- Bun runtime (bun.sh)
- Claude Code with hooks support
- Optional: Voice/notification server for status messages
