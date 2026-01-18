/**
 * Shared Insight Extraction Library
 *
 * Extracts decisions, mistakes, corrections, and key context from conversation transcripts.
 * Used by both pre-compact and session-save hooks.
 *
 * Part of the pai-hindsight-memory pack.
 */

import { readFileSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ============================================================================
// Configuration
// ============================================================================

const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
const HINDSIGHT_URL = process.env.HINDSIGHT_PROJECT_URL || 'http://localhost:8889';
const PROJECT_BANK = process.env.HINDSIGHT_PROJECT || 'project';

// LLM Configuration
const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || 'http://uber.lan:11434';
const LOCAL_LLM_MODEL = process.env.LOCAL_LLM_MODEL || 'qwen2.5:32b-instruct-q4_K_M';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Chunk size for local LLM (aim for ~20K chars to fit in 32K context with prompt)
const CHUNK_SIZE = 20000;
const CHUNK_OVERLAP = 1000;

// ============================================================================
// Types
// ============================================================================

export interface ExtractedInsights {
  decisions: string[];
  mistakes: string[];
  corrections: string[];
  key_context: string[];
}

interface TranscriptEntry {
  type: string;
  timestamp?: string;
  message?: {
    role?: string;
    content?: unknown;
  };
}

// ============================================================================
// Logging
// ============================================================================

export function log(prefix: string, message: string): void {
  const debugPath = join(PAI_DIR, 'history', 'hindsight-debug.log');
  try {
    appendFileSync(debugPath, `[${new Date().toISOString()}] ${prefix}: ${message}\n`);
  } catch {}
}

// ============================================================================
// Transcript Parsing
// ============================================================================

function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(c => {
        if (typeof c === 'string') return c;
        if (c?.text) return c.text;
        if (c?.content) return contentToText(c.content);
        return '';
      })
      .join('\n')
      .trim();
  }
  return '';
}

export function parseTranscriptForInsights(transcriptPath: string): string {
  if (!existsSync(transcriptPath)) {
    return '';
  }

  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    const conversationParts: string[] = [];

    for (const line of lines) {
      try {
        const entry: TranscriptEntry = JSON.parse(line);

        if (entry.type === 'user' && entry.message?.content) {
          const text = contentToText(entry.message.content);
          if (text) {
            conversationParts.push(`USER: ${text.slice(0, 2000)}`);
          }
        }

        if (entry.type === 'assistant' && entry.message?.content) {
          const text = contentToText(entry.message.content);
          if (text) {
            conversationParts.push(`ASSISTANT: ${text.slice(0, 2000)}`);
          }
        }

        // Include tool results for context on errors
        if (entry.type === 'tool_result') {
          const resultContent = entry.message?.content;
          if (Array.isArray(resultContent)) {
            for (const item of resultContent) {
              if (item.type === 'tool_result' && item.is_error) {
                const errText = typeof item.content === 'string'
                  ? item.content
                  : JSON.stringify(item.content);
                conversationParts.push(`TOOL_ERROR: ${errText.slice(0, 500)}`);
              }
            }
          }
        }
      } catch {
        // Skip malformed lines
      }
    }

    return conversationParts.join('\n\n');
  } catch {
    return '';
  }
}

// ============================================================================
// Chunking
// ============================================================================

function chunkTranscript(transcript: string): string[] {
  if (transcript.length <= CHUNK_SIZE) {
    return [transcript];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < transcript.length) {
    let end = start + CHUNK_SIZE;

    // Try to break at a natural boundary (double newline between messages)
    if (end < transcript.length) {
      const breakPoint = transcript.lastIndexOf('\n\n', end);
      if (breakPoint > start + CHUNK_SIZE / 2) {
        end = breakPoint;
      }
    }

    chunks.push(transcript.slice(start, end));
    start = end - CHUNK_OVERLAP;
    if (start < 0) start = 0;
  }

  return chunks;
}

// ============================================================================
// Prompt Building
// ============================================================================

function buildAnalysisPrompt(transcript: string, projectName: string): string {
  return `You are analyzing a conversation transcript from a coding session. Your job is to extract the most important learnings that should be preserved for future sessions.

PROJECT: ${projectName}

Analyze this conversation and extract:

1. **DECISIONS**: Important technical decisions made during this session (architecture choices, library selections, approach decisions). Only include decisions that would be valuable to remember in future sessions.

2. **MISTAKES**: Errors, bugs, or wrong approaches that were encountered. These are valuable to remember so we don't repeat them.

3. **CORRECTIONS**: Incorrect assumptions or misunderstandings that were corrected during the session. Include what was wrong and what the correct understanding is.

4. **KEY_CONTEXT**: Important context about the project, codebase, or user preferences that was discovered or clarified. Things that would be valuable to know in future sessions.

For each category, provide clear, standalone statements that would make sense without the full conversation context. Be specific and include relevant details (file names, function names, etc.).

If a category has no relevant items, return an empty array for it.

CONVERSATION TRANSCRIPT:
${transcript}

Respond with a JSON object in this exact format:
{
  "decisions": ["decision 1", "decision 2"],
  "mistakes": ["mistake 1", "mistake 2"],
  "corrections": ["correction 1", "correction 2"],
  "key_context": ["context 1", "context 2"]
}`;
}

// ============================================================================
// Response Parsing
// ============================================================================

function parseInsightsResponse(responseText: string): ExtractedInsights | null {
  if (!responseText) {
    return null;
  }

  // Try multiple extraction strategies
  let jsonStr = responseText;

  // Strategy 1: Extract from markdown code blocks
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  } else {
    // Strategy 2: Find the first complete JSON object
    const jsonStart = responseText.indexOf('{');
    if (jsonStart !== -1) {
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let i = jsonStart; i < responseText.length; i++) {
        const char = responseText[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (char === '\\' && inString) {
          escape = true;
          continue;
        }
        if (char === '"' && !escape) {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === '{') depth++;
          if (char === '}') {
            depth--;
            if (depth === 0) {
              jsonStr = responseText.slice(jsonStart, i + 1);
              break;
            }
          }
        }
      }
    }
  }

  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    return null;
  }
}

// ============================================================================
// LLM Analysis
// ============================================================================

async function analyzeWithLocalLLM(prompt: string, strictMode: boolean = false): Promise<string | null> {
  try {
    // In strict mode: lower temperature, system message for JSON, request JSON format
    const messages = strictMode
      ? [
          {
            role: 'system',
            content: 'You are a JSON-only assistant. You MUST respond with valid JSON only. No explanations, no markdown, no commentary - just the raw JSON object.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ]
      : [
          {
            role: 'user',
            content: prompt,
          },
        ];

    const requestBody: Record<string, unknown> = {
      model: LOCAL_LLM_MODEL,
      messages,
      temperature: strictMode ? 0.1 : 0.3,
      max_tokens: 4096,
    };

    // Request JSON format if in strict mode (supported by many OpenAI-compatible APIs)
    if (strictMode) {
      requestBody.response_format = { type: 'json_object' };
    }

    const response = await fetch(`${LOCAL_LLM_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

async function analyzeWithAnthropic(prompt: string): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) {
    return null;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.content?.[0]?.text || null;
  } catch {
    return null;
  }
}

async function analyzeChunk(
  logPrefix: string,
  chunk: string,
  chunkNum: number,
  totalChunks: number,
  projectName: string
): Promise<ExtractedInsights | null> {
  const chunkContext = totalChunks > 1
    ? `\n\nNote: This is chunk ${chunkNum} of ${totalChunks} from the conversation. Extract insights from this portion.`
    : '';

  const prompt = buildAnalysisPrompt(chunk, projectName) + chunkContext;

  // Try local LLM first
  let responseText = await analyzeWithLocalLLM(prompt);

  // Fall back to Anthropic if local fails
  if (!responseText && ANTHROPIC_API_KEY) {
    log(logPrefix, `Chunk ${chunkNum}: Local LLM failed, trying Anthropic`);
    responseText = await analyzeWithAnthropic(prompt);
  }

  if (!responseText) {
    log(logPrefix, `Chunk ${chunkNum}: No response from any LLM`);
    return null;
  }

  let insights = parseInsightsResponse(responseText);

  if (insights) {
    const total = insights.decisions.length + insights.mistakes.length +
                  insights.corrections.length + insights.key_context.length;
    log(logPrefix, `Chunk ${chunkNum}: Extracted ${total} insights`);
    return insights;
  }

  // Log the full failed response for debugging
  log(logPrefix, `Chunk ${chunkNum}: Failed to parse response. Full LLM response:\n${responseText}`);

  // Retry once with stricter settings
  log(logPrefix, `Chunk ${chunkNum}: Retrying with stricter JSON settings...`);
  responseText = await analyzeWithLocalLLM(prompt, true); // strict mode

  if (responseText) {
    insights = parseInsightsResponse(responseText);
    if (insights) {
      const total = insights.decisions.length + insights.mistakes.length +
                    insights.corrections.length + insights.key_context.length;
      log(logPrefix, `Chunk ${chunkNum}: Retry succeeded - extracted ${total} insights`);
      return insights;
    }
    log(logPrefix, `Chunk ${chunkNum}: Retry also failed. Response:\n${responseText}`);
  }

  return null;
}

// ============================================================================
// Merging
// ============================================================================

function mergeInsights(allInsights: ExtractedInsights[]): ExtractedInsights {
  const merged: ExtractedInsights = {
    decisions: [],
    mistakes: [],
    corrections: [],
    key_context: [],
  };

  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const seen = new Set<string>();

  for (const insights of allInsights) {
    for (const decision of insights.decisions) {
      const key = normalize(decision);
      if (!seen.has(key)) {
        seen.add(key);
        merged.decisions.push(decision);
      }
    }
    for (const mistake of insights.mistakes) {
      const key = normalize(mistake);
      if (!seen.has(key)) {
        seen.add(key);
        merged.mistakes.push(mistake);
      }
    }
    for (const correction of insights.corrections) {
      const key = normalize(correction);
      if (!seen.has(key)) {
        seen.add(key);
        merged.corrections.push(correction);
      }
    }
    for (const context of insights.key_context) {
      const key = normalize(context);
      if (!seen.has(key)) {
        seen.add(key);
        merged.key_context.push(context);
      }
    }
  }

  return merged;
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Extract insights from a transcript file.
 * Handles chunking for large transcripts and merges results.
 */
export async function extractInsights(
  logPrefix: string,
  transcriptPath: string,
  projectName: string
): Promise<ExtractedInsights | null> {
  const transcript = parseTranscriptForInsights(transcriptPath);

  if (!transcript) {
    log(logPrefix, 'Empty or invalid transcript');
    return null;
  }

  log(logPrefix, `Transcript parsed: ${transcript.length} characters`);

  const chunks = chunkTranscript(transcript);
  log(logPrefix, `Transcript split into ${chunks.length} chunks`);

  const allInsights: ExtractedInsights[] = [];

  // Process chunks sequentially to avoid overloading local LLM
  for (let i = 0; i < chunks.length; i++) {
    log(logPrefix, `Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
    const insights = await analyzeChunk(logPrefix, chunks[i], i + 1, chunks.length, projectName);
    if (insights) {
      allInsights.push(insights);
    }
  }

  if (allInsights.length === 0) {
    log(logPrefix, 'No insights extracted from any chunk');
    return null;
  }

  const merged = mergeInsights(allInsights);
  const totalInsights = merged.decisions.length + merged.mistakes.length +
                        merged.corrections.length + merged.key_context.length;

  log(logPrefix, `Merged insights: ${merged.decisions.length} decisions, ${merged.mistakes.length} mistakes, ${merged.corrections.length} corrections, ${merged.key_context.length} context items`);

  if (totalInsights === 0) {
    log(logPrefix, 'All chunks returned empty insights');
    return null;
  }

  return merged;
}

/**
 * Store extracted insights to Hindsight memory bank.
 */
export async function storeInsights(
  logPrefix: string,
  insights: ExtractedInsights,
  projectName: string,
  sessionId: string,
  context: string = 'session-insights'
): Promise<boolean> {
  const memories: string[] = [];

  if (insights.decisions.length > 0) {
    for (const decision of insights.decisions) {
      memories.push(`DECISION: ${decision}`);
    }
  }

  if (insights.mistakes.length > 0) {
    for (const mistake of insights.mistakes) {
      memories.push(`MISTAKE TO AVOID: ${mistake}`);
    }
  }

  if (insights.corrections.length > 0) {
    for (const correction of insights.corrections) {
      memories.push(`CORRECTION: ${correction}`);
    }
  }

  if (insights.key_context.length > 0) {
    for (const ctx of insights.key_context) {
      memories.push(`KEY CONTEXT: ${ctx}`);
    }
  }

  if (memories.length === 0) {
    log(logPrefix, 'No insights to store');
    return false;
  }

  const narrative = `Session analysis for project ${projectName} on ${new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}:\n\n${memories.join('\n\n')}`;

  try {
    const response = await fetch(`${HINDSIGHT_URL}/v1/default/banks/${PROJECT_BANK}/memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            content: narrative,
            context,
            document_id: `insights_${sessionId}_${Date.now()}`,
            timestamp: new Date().toISOString(),
            metadata: {
              project: projectName,
              type: context,
              decisions_count: String(insights.decisions.length),
              mistakes_count: String(insights.mistakes.length),
              corrections_count: String(insights.corrections.length),
              context_count: String(insights.key_context.length),
            },
          },
        ],
        async: true,
      }),
    });

    if (response.ok) {
      log(logPrefix, `Successfully stored ${memories.length} insights to bank "${PROJECT_BANK}"`);
      return true;
    } else {
      const errorText = await response.text();
      log(logPrefix, `Failed to store insights: ${response.status} - ${errorText.slice(0, 200)}`);
      return false;
    }
  } catch (error) {
    log(logPrefix, `Error storing insights: ${error}`);
    return false;
  }
}
