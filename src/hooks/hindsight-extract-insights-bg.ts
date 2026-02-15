#!/usr/bin/env bun
/**
 * PAI Hindsight Background Insight Extraction
 *
 * Standalone script that extracts insights from a transcript file.
 * Designed to be spawned as a background process from pre-compact and session-save hooks.
 *
 * Supports incremental processing - only processes new content since last extraction.
 *
 * Usage: bun run hindsight-extract-insights-bg.ts <transcript_path> <project_name> <session_id>
 *
 * Part of the pai-hindsight-memory pack.
 */

import {
  extractInsights,
  storeInsights,
  log,
  getLastProcessedLine,
  setLastProcessedLine,
} from './lib/insight-extractor';

const LOG_PREFIX = 'InsightsBg';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    log(LOG_PREFIX, 'Missing arguments: transcript_path, project_name, session_id');
    process.exit(1);
  }

  const [transcriptPath, projectName, sessionId] = args;

  log(LOG_PREFIX, `Starting background insight extraction for ${projectName}`);
  log(LOG_PREFIX, `Transcript: ${transcriptPath}`);
  log(LOG_PREFIX, `Session: ${sessionId}`);

  // Get last processed line for incremental extraction
  const startLine = getLastProcessedLine(sessionId);
  if (startLine > 0) {
    log(LOG_PREFIX, `Resuming from line ${startLine} (incremental mode)`);
  }

  try {
    const result = await extractInsights(LOG_PREFIX, transcriptPath, projectName, startLine);

    if (result.insights) {
      const totalInsights =
        result.insights.decisions.length +
        result.insights.mistakes.length +
        result.insights.corrections.length +
        result.insights.key_context.length;

      log(LOG_PREFIX, `Extracted ${totalInsights} insights from ${result.processedLines} new lines`);

      const stored = await storeInsights(LOG_PREFIX, result.insights, projectName, sessionId, 'session-insights');

      if (stored) {
        log(LOG_PREFIX, `Successfully stored insights for ${projectName}`);
        // Update state to track where we left off
        setLastProcessedLine(sessionId, result.totalLines);
        log(LOG_PREFIX, `Updated state: next extraction will start at line ${result.totalLines}`);
      } else {
        log(LOG_PREFIX, `Failed to store insights for ${projectName}`);
      }
    } else {
      log(LOG_PREFIX, `No insights extracted for ${projectName}`);
      // Still update state if we processed lines (even if no insights found)
      if (result.totalLines > startLine) {
        setLastProcessedLine(sessionId, result.totalLines);
        log(LOG_PREFIX, `Updated state: next extraction will start at line ${result.totalLines}`);
      }
    }
  } catch (error) {
    log(LOG_PREFIX, `Error: ${error}`);
  }

  process.exit(0);
}

main();
