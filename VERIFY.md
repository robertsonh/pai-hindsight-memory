# Verification Checklist - PAI Hindsight Memory

Run these checks after installation to verify everything is working.

## Prerequisites Check

```bash
# Bun is installed
bun --version
# Expected: 1.x.x or higher

# PAI_DIR is set
echo "${PAI_DIR:-$HOME/.config/pai}"
# Expected: Valid directory path
```

- [ ] Bun version 1.0+ installed
- [ ] PAI_DIR points to valid directory

---

## Skill Installation Check

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Check skill file exists
ls -la "$PAI_DIR/skills/Memory/SKILL.md"
# Expected: File exists

# Check workflows exist
ls -la "$PAI_DIR/skills/Memory/Workflows/"
# Expected: Recall.md, Retain.md, Reflect.md, ManageBanks.md

# Verify skill frontmatter
head -5 "$PAI_DIR/skills/Memory/SKILL.md"
# Expected: YAML frontmatter with name: Memory
```

- [ ] `$PAI_DIR/skills/Memory/SKILL.md` exists
- [ ] `$PAI_DIR/skills/Memory/Workflows/Recall.md` exists
- [ ] `$PAI_DIR/skills/Memory/Workflows/Retain.md` exists
- [ ] `$PAI_DIR/skills/Memory/Workflows/Reflect.md` exists
- [ ] `$PAI_DIR/skills/Memory/Workflows/ManageBanks.md` exists

---

## Hooks Installation Check

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Check hooks exist
ls -la "$PAI_DIR/hooks/"*hindsight*
# Expected: Two hook files

# Test session start hook
echo '{"session_id": "test", "cwd": "'$(pwd)'"}' | bun run "$PAI_DIR/hooks/hindsight-session-start.ts"
# Expected: No errors (may output context if available)

# Test session save hook (dry run)
echo '{"session_id": "test", "cwd": "'$(pwd)'"}' | bun run "$PAI_DIR/hooks/hindsight-session-save.ts"
# Expected: No errors (may output "Hindsight: Saved session context...")
```

- [ ] `hindsight-session-start.ts` exists and runs without error
- [ ] `hindsight-session-save.ts` exists and runs without error

---

## Global Settings Configuration Check (CRITICAL)

> **IMPORTANT:** Claude Code reads hooks from `~/.claude/settings.json` (global settings), NOT from `$PAI_DIR/settings.json`. The PAI settings file is a reference template only.

```bash
# Check GLOBAL settings.json for SessionEnd hooks
grep -A10 "SessionEnd" ~/.claude/settings.json 2>/dev/null || echo "SessionEnd not configured in global settings!"

# Verify matcher field exists (REQUIRED or hooks won't fire)
grep -B2 -A5 "hindsight-session-save" ~/.claude/settings.json 2>/dev/null | grep -q "matcher" && echo "✓ matcher field present" || echo "✗ MISSING matcher field!"
```

**Expected output:**
```json
"SessionEnd": [
  {
    "matcher": "*",
    "hooks": [
      ...
      {
        "type": "command",
        "command": "bun run /path/to/hooks/hindsight-session-save.ts"
      }
    ]
  }
]
```

- [ ] `~/.claude/settings.json` contains SessionEnd hooks
- [ ] SessionEnd block includes `"matcher": "*"` (REQUIRED)
- [ ] `hindsight-session-start.ts` is in SessionStart hooks
- [ ] `hindsight-session-save.ts` is in SessionEnd hooks

> **Common Issue:** If hooks aren't firing, check that `"matcher": "*"` is present in every hook block. Without it, hooks silently fail to execute.

---

## Hindsight MCP Server Check

```bash
# Check MCP configuration exists
cat ~/.claude.json 2>/dev/null | grep -A2 "hindsight" || echo "Check MCP config location"

# OR check project-level config
cat .mcp.json 2>/dev/null | grep -A2 "hindsight" || echo "No project-level MCP config"
```

- [ ] `hindsight-project` MCP server is configured
- [ ] `hindsight-hedley` MCP server is configured

---

## Functional Test

In a new Claude Code session, test the Memory skill:

1. **Test Recall:**
   ```
   User: "What do you remember about this project?"
   Expected: AI invokes mcp__hindsight-project__recall
   ```

2. **Test Retain:**
   ```
   User: "Remember that we use TypeScript for this project"
   Expected: AI invokes mcp__hindsight-project__retain
   ```

3. **Test Reflect:**
   ```
   User: "What patterns have you noticed in my coding style?"
   Expected: AI invokes mcp__hindsight-hedley__reflect
   ```

4. **Test Bank Management:**
   ```
   User: "List all memory banks"
   Expected: AI invokes mcp__hindsight-project__list_banks
   ```

- [ ] Recall workflow activates correctly
- [ ] Retain workflow stores memories
- [ ] Reflect workflow synthesizes insights
- [ ] ManageBanks workflow lists/creates banks

---

## Session Lifecycle Test

1. Start a new Claude Code session in a project directory
2. Do some work (read files, make changes)
3. Exit the session
4. Check for session memory:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Check for pending memories (local fallback)
cat "$PAI_DIR/history/hindsight-pending.jsonl" 2>/dev/null | tail -5
```

5. Start a new session in the same project
6. Verify context is loaded or available via recall

- [ ] Session save hook fires on exit
- [ ] Session start hook fires on new session
- [ ] Context persists between sessions

---

## Troubleshooting

### Hook not firing

Check settings.json hook configuration:
```bash
cat "$PAI_DIR/settings.json" | jq '.hooks'
```

### MCP tools not available

Verify MCP server is running:
```bash
# List available MCP tools in Claude
# Should show mcp__hindsight-project__* and mcp__hindsight-hedley__*
```

### Permission errors

```bash
chmod +x "$PAI_DIR/hooks/hindsight-session-save.ts"
chmod +x "$PAI_DIR/hooks/hindsight-session-start.ts"
```

---

## All Checks Passed

If all checks pass:

- [ ] Prerequisites verified
- [ ] Skill installed correctly
- [ ] Hooks installed correctly
- [ ] **Global settings configured** (`~/.claude/settings.json` with `matcher: "*"`)
- [ ] MCP servers accessible
- [ ] Functional tests pass
- [ ] Session lifecycle works

**Installation complete!** Your AI now has persistent memory across sessions.

> **Remember:** Hooks are configured in `~/.claude/settings.json` (global), not `$PAI_DIR/settings.json`. Every hook block needs `"matcher": "*"` or it won't fire.
