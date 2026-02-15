# Uninstall Guide - PAI Hindsight Memory

This guide explains how to remove the PAI Hindsight Memory pack from your system.

## Quick Uninstall

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Remove skill files
rm -rf "$PAI_DIR/skills/Memory"

# Remove hooks
rm -f "$PAI_DIR/hooks/hindsight-session-start.ts"
rm -f "$PAI_DIR/hooks/hindsight-session-save.ts"

# Remove pending memories (optional - keeps local backup)
# rm -f "$PAI_DIR/history/hindsight-pending.jsonl"

echo "PAI Hindsight Memory pack removed"
```

---

## Step-by-Step Uninstall

### Step 1: Remove Hook Configuration

Edit your `$PAI_DIR/settings.json` and remove the Hindsight hooks:

**Remove from SessionStart hooks:**
```json
{
  "type": "command",
  "command": "bun run $PAI_DIR/hooks/hindsight-session-start.ts",
  "_source": "pai-hindsight-memory"
}
```

**Remove from SessionEnd hooks:**
```json
{
  "type": "command",
  "command": "bun run $PAI_DIR/hooks/hindsight-session-save.ts",
  "_source": "pai-hindsight-memory"
}
```

You can identify these entries by the `"_source": "pai-hindsight-memory"` field.

### Step 2: Remove Hook Files

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

rm -f "$PAI_DIR/hooks/hindsight-session-start.ts"
rm -f "$PAI_DIR/hooks/hindsight-session-save.ts"

# Verify removal
ls "$PAI_DIR/hooks/"*hindsight* 2>/dev/null || echo "Hooks removed successfully"
```

### Step 3: Remove Skill Files

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

rm -rf "$PAI_DIR/skills/Memory"

# Verify removal
ls "$PAI_DIR/skills/Memory" 2>/dev/null || echo "Skill removed successfully"
```

### Step 4: Clean Up Local Data (Optional)

The pack may have created local fallback files:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# View pending memories before deletion
cat "$PAI_DIR/history/hindsight-pending.jsonl" 2>/dev/null

# Remove if desired
rm -f "$PAI_DIR/history/hindsight-pending.jsonl"
```

### Step 5: Remove Environment Variables (Optional)

If you added environment variables, remove them from your shell profile:

```bash
# Edit ~/.zshrc or ~/.bashrc and remove:
# export HINDSIGHT_PERSONAL_BANK=...
# export HINDSIGHT_PROJECT_URL=...
```

---

## Keeping Your Memories

**Important:** Uninstalling this pack does NOT delete your memories stored in Hindsight.

Your memories remain in the Hindsight database and can be accessed:
- Via the Hindsight MCP servers (if still configured)
- Through the Hindsight web interface
- By reinstalling this pack

To completely remove all memories, you would need to delete the data from Hindsight directly.

---

## Verify Uninstall

After uninstalling, verify the pack is removed:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Check skill is removed
test -d "$PAI_DIR/skills/Memory" && echo "WARNING: Skill still exists" || echo "✓ Skill removed"

# Check hooks are removed
test -f "$PAI_DIR/hooks/hindsight-session-start.ts" && echo "WARNING: Start hook still exists" || echo "✓ Start hook removed"
test -f "$PAI_DIR/hooks/hindsight-session-save.ts" && echo "WARNING: Save hook still exists" || echo "✓ Save hook removed"

# Check settings.json doesn't reference the hooks
grep -q "pai-hindsight-memory" "$PAI_DIR/settings.json" 2>/dev/null && echo "WARNING: Hook config still in settings.json" || echo "✓ Settings cleaned"
```

---

## Reinstalling

To reinstall the pack later, follow the instructions in [INSTALL.md](INSTALL.md).
