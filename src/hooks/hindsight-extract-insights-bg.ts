#!/usr/bin/env bun
/**
 * PAI Hindsight Background Insight Extraction
 *
 * Standalone script that extracts insights from a transcript file.
 * Designed to be spawned as a background process from session-save hook.
 *
 * Usage: bun run hindsight-extract-insights-bg.ts <transcript_path> <project_name> <session_id>
 *
 * Part of the pai-hindsight-memory pack.
 */

import { extractInsights, storeInsights, log } from './lib/insight-extractor';

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

  try {
    const insights = await extractInsights(LOG_PREFIX, transcriptPath, projectName);

    if (insights) {
      const totalInsights =
        insights.decisions.length +
        insights.mistakes.length +
        insights.corrections.length +
        insights.key_context.length;

      log(LOG_PREFIX, `Extracted ${totalInsights} insights`);

      const stored = await storeInsights(LOG_PREFIX, insights, projectName, sessionId, 'session-insights');

      if (stored) {
        log(LOG_PREFIX, `Successfully stored insights for ${projectName}`);
      } else {
        log(LOG_PREFIX, `Failed to store insights for ${projectName}`);
      }
    } else {
      log(LOG_PREFIX, `No insights extracted for ${projectName}`);
    }
  } catch (error) {
    log(LOG_PREFIX, `Error: ${error}`);
  }

  process.exit(0);
}

main();
