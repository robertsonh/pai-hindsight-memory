# Installation Guide - PAI Hindsight Memory

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Claude Code** (or compatible agent with hook support)
- **Hindsight MCP servers** configured in Claude settings:
  - `hindsight-project` - For project memories
  - `hindsight-hedley` - For personal memories
- **Write access** to `$PAI_DIR/` (default: `~/.config/pai`)

---

## Pre-Installation: System Analysis

### Step 0.1: Check Current Configuration

```bash
# 1. Verify PAI_DIR is set
echo "PAI_DIR: ${PAI_DIR:-$HOME/.config/pai}"

# 2. Check existing PAI directory
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"
if [ -d "$PAI_CHECK" ]; then
  echo "PAI directory exists at: $PAI_CHECK"
  ls -la "$PAI_CHECK/skills/" 2>/dev/null || echo "  No skills directory"
  ls -la "$PAI_CHECK/hooks/" 2>/dev/null || echo "  No hooks directory"
else
  echo "PAI directory does not exist (fresh install)"
fi

# 3. Check for Hindsight MCP servers
if [ -f "$HOME/.claude.json" ]; then
  echo "Checking MCP server configuration..."
  grep -q "hindsight-project" "$HOME/.claude.json" && echo "  hindsight-project: configured" || echo "  hindsight-project: NOT configured"
  grep -q "hindsight-hedley" "$HOME/.claude.json" && echo "  hindsight-hedley: NOT configured" || echo "  hindsight-hedley: configured"
fi
```

### Step 0.2: Verify Hindsight MCP Servers

**IMPORTANT**: This pack requires Hindsight MCP servers to be configured.

Check your MCP configuration (typically in `~/.claude.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "hindsight-project": {
      "command": "...",
      "args": ["..."]
    },
    "hindsight-hedley": {
      "command": "...",
      "args": ["..."]
    }
  }
}
```

If not configured, see: https://hindsight.vectorize.io/ for setup instructions.

### Step 0.3: Conflict Resolution Matrix

| Scenario | Action |
|----------|--------|
| Fresh install, no conflicts | Proceed normally |
| Memory skill exists | Backup and replace |
| Hooks exist in settings.json | MERGE new hooks with existing |
| No Hindsight servers | Configure Hindsight first |

---

## Installation Steps

### Step 1: Create Directory Structure

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Create directories
mkdir -p "$PAI_DIR/skills/Memory/Workflows"
mkdir -p "$PAI_DIR/skills/Memory/Tools"
mkdir -p "$PAI_DIR/hooks"
mkdir -p "$PAI_DIR/history"

# Verify
ls -la "$PAI_DIR/skills/"
ls -la "$PAI_DIR/hooks/"
```

### Step 2: Install Memory Skill

Copy skill files from `src/skills/Memory/` to `$PAI_DIR/skills/Memory/`:

```bash
# From the pack directory:
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACK_DIR="$(pwd)"

# Copy skill files
cp "$PACK_DIR/src/skills/Memory/SKILL.md" "$PAI_DIR/skills/Memory/"
cp "$PACK_DIR/src/skills/Memory/Workflows/"*.md "$PAI_DIR/skills/Memory/Workflows/"

# Verify
ls -la "$PAI_DIR/skills/Memory/"
ls -la "$PAI_DIR/skills/Memory/Workflows/"
```

**Expected files:**
```
$PAI_DIR/skills/Memory/
├── SKILL.md
├── Workflows/
│   ├── Recall.md
│   ├── Retain.md
│   ├── Reflect.md
│   └── ManageBanks.md
└── Tools/
    (empty - uses MCP tools)
```

### Step 3: Install Hooks

Copy hook files from `src/hooks/` to `$PAI_DIR/hooks/`:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACK_DIR="$(pwd)"

# Copy hooks
cp "$PACK_DIR/src/hooks/hindsight-session-save.ts" "$PAI_DIR/hooks/"
cp "$PACK_DIR/src/hooks/hindsight-session-start.ts" "$PAI_DIR/hooks/"
cp "$PACK_DIR/src/hooks/hindsight-pre-compact.ts" "$PAI_DIR/hooks/"
cp "$PACK_DIR/src/hooks/hindsight-post-compact.ts" "$PAI_DIR/hooks/"
cp "$PACK_DIR/src/hooks/hindsight-extract-insights-bg.ts" "$PAI_DIR/hooks/"

# Copy hook library (required by hooks)
mkdir -p "$PAI_DIR/hooks/lib"
cp "$PACK_DIR/src/hooks/lib/insight-extractor.ts" "$PAI_DIR/hooks/lib/"

# Make executable
chmod +x "$PAI_DIR/hooks/hindsight-session-save.ts"
chmod +x "$PAI_DIR/hooks/hindsight-session-start.ts"
chmod +x "$PAI_DIR/hooks/hindsight-pre-compact.ts"
chmod +x "$PAI_DIR/hooks/hindsight-post-compact.ts"
chmod +x "$PAI_DIR/hooks/hindsight-extract-insights-bg.ts"

# Verify
ls -la "$PAI_DIR/hooks/"*hindsight*
```

### Step 4: Configure Hooks in Claude Settings

> **IMPORTANT:** Claude Code reads hooks from `~/.claude/settings.json` (the global Claude settings file), NOT from `$PAI_DIR/settings.json`. The PAI settings file is a reference template only.

Add the following hooks to your `~/.claude/settings.json`.

> **CRITICAL:** Every hook block MUST include `"matcher": "*"` - without it, the hook won't fire!

**If hooks section doesn't exist, add it:**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run /home/YOUR_USER/.config/pai/hooks/hindsight-session-start.ts"
          }
        ]
      }
    ],

    "SessionEnd": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run /home/YOUR_USER/.config/pai/hooks/hindsight-session-save.ts"
          }
        ]
      }
    ],

    "PreCompact": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run /home/YOUR_USER/.config/pai/hooks/hindsight-pre-compact.ts"
          }
        ]
      }
    ],

    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run /home/YOUR_USER/.config/pai/hooks/hindsight-post-compact.ts"
          }
        ]
      }
    ]
  }
}
```

> **Note:** Replace `/home/YOUR_USER` with your actual home directory path, or set `PAI_DIR` in the `env` section and use `$PAI_DIR` in commands.

**If hooks already exist, MERGE the new hooks:**

Add to the `SessionStart[0].hooks` array:
```json
{
  "type": "command",
  "command": "bun run /home/YOUR_USER/.config/pai/hooks/hindsight-session-start.ts"
}
```

Add `SessionEnd` section (if it doesn't exist):
```json
"SessionEnd": [
  {
    "matcher": "*",
    "hooks": [
      {
        "type": "command",
        "command": "bun run /home/YOUR_USER/.config/pai/hooks/hindsight-session-save.ts"
      }
    ]
  }
]
```

### Step 5: Bank Auto-Creation

The hooks automatically create memory banks if they don't exist. When a session starts or ends, the hook will:

1. Check if the bank specified by `HINDSIGHT_PROJECT` exists
2. Create it via `PUT /v1/default/banks/{bank_id}` if missing
3. Proceed with recall/retain operations

This means you don't need to manually create banks before first use.

### Step 6: Set Environment Variables (Optional)

**Project Bank Name:**

The project memory bank defaults to `project`. To use a different name:

```bash
# Add to ~/.zshrc or ~/.bashrc
export HINDSIGHT_PROJECT=myproject  # or your preferred name
```

> **Important:** Your MCP server should match. Example `.mcp.json`:
> ```json
> {
>   "mcpServers": {
>     "hindsight-project": {
>       "type": "http",
>       "url": "http://localhost:8889/mcp/${HINDSIGHT_PROJECT:-project}/"
>     }
>   }
> }
> ```

**Personal Bank Name:**

The personal memory bank defaults to `hedley`. To use a different name:

```bash
export HINDSIGHT_PERSONAL_BANK=personal  # or your preferred name
```

> **Important:** Your MCP server name must match. If you set `HINDSIGHT_PERSONAL_BANK=personal`,
> your MCP config should have `hindsight-personal` as the server name.

**HTTP API URL (optional):**

```bash
export HINDSIGHT_PROJECT_URL=http://localhost:8889
```

---

## Verification

Run the verification checklist in VERIFY.md to confirm installation.

Quick check:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Check skill exists
test -f "$PAI_DIR/skills/Memory/SKILL.md" && echo "✓ Memory skill installed" || echo "✗ Memory skill missing"

# Check workflows exist
test -f "$PAI_DIR/skills/Memory/Workflows/Recall.md" && echo "✓ Recall workflow installed" || echo "✗ Recall workflow missing"

# Check hooks exist
test -f "$PAI_DIR/hooks/hindsight-session-save.ts" && echo "✓ Session save hook installed" || echo "✗ Session save hook missing"
test -f "$PAI_DIR/hooks/hindsight-session-start.ts" && echo "✓ Session start hook installed" || echo "✗ Session start hook missing"

# Test hook runs
echo '{}' | bun run "$PAI_DIR/hooks/hindsight-session-start.ts" && echo "✓ Session start hook runs" || echo "✗ Session start hook error"
```

---

## Standalone Installation (Without PAI)

If you're not using the full PAI system, you can install just the hooks for automatic session memory:

### Minimal Setup

1. **Install Bun**: `curl -fsSL https://bun.sh/install | bash`

2. **Create hooks directory**:
```bash
mkdir -p ~/.local/share/hindsight-hooks
```

3. **Copy hook files**:
```bash
cp src/hooks/hindsight-session-*.ts ~/.local/share/hindsight-hooks/
chmod +x ~/.local/share/hindsight-hooks/*.ts
```

4. **Add to `~/.claude/settings.json`**:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run ~/.local/share/hindsight-hooks/hindsight-session-start.ts"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run ~/.local/share/hindsight-hooks/hindsight-session-save.ts"
          }
        ]
      }
    ]
  }
}
```

5. **Set environment variables** (add to `~/.zshrc` or `~/.bashrc`):
```bash
export PAI_DIR="$HOME/.local/share/hindsight-hooks"
export HINDSIGHT_PROJECT=myproject
export HINDSIGHT_PERSONAL_BANK=personal
```

6. **Configure Hindsight MCP servers** in your `.mcp.json` or `~/.claude.json`

That's it! The hooks will automatically save and load session context without the full PAI system.

---

## Usage

After installation, restart Claude Code to activate hooks.

**Automatic behavior:**
- On session start: Recalls recent project context (if available)
- On session end: Saves session summary to hindsight-project

**Manual commands (via Memory skill):**
- "What do you remember about [topic]?" → Recall workflow
- "Remember that [fact]" → Retain workflow
- "What patterns have you noticed in [area]?" → Reflect workflow
- "List memory banks" → ManageBanks workflow
