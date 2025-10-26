import { z } from 'zod';

// Configuration schema for validation
export const ConfigSchema = z.object({
  openRouterApiKey: z.string().min(1, 'OpenRouter API key is required').optional(),
  modelId: z.string().min(1, 'Model ID is required').optional(),
  repositoryPath: z.string().default(process.cwd()),
  outputDirectory: z.string().default('./summaries'),
  maxCommits: z.number().int().positive().default(100),
  language: z.enum(['en', 'id']).default('id')
});

export type Config = z.infer<typeof ConfigSchema>;

// Git commit information
export interface GitCommit {
  hash: string;
  date: string;
  message: string;
  author: {
    name: string;
    email: string;
  };
  refs?: string;
}

// Git diff information
export interface GitDiff {
  file: string;
  changes: number;
  insertions: number;
  deletions: number;
  diff: string;
}

// Commit analysis result
export interface CommitAnalysis {
  commitHash: string;
  summary: string;
  filesChanged: string[];
  impact: string;
  recommendations?: string[];
}

// OpenRouter API types
export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// MCP tool definitions
export interface GitLogParams {
  limit?: number;
  since?: string;
  until?: string;
  author?: string;
}

export interface GitDiffParams {
  commitHash?: string;
  fromCommit?: string;
  toCommit?: string;
  filePath?: string;
}

export interface AnalyzeCommitParams {
  commitHash: string;
  generateSummary?: boolean;
  outputFile?: string;
}