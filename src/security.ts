import { z } from 'zod';
import path from 'path';
import fs from 'fs-extra';

/**
 * Security utilities for GitLogMCP
 * Prevents path traversal, command injection, and validates inputs
 */

// Regex patterns for validation
const COMMIT_HASH_PATTERN = /^[a-f0-9]{7,40}$/i;
const GIT_REFERENCE_PATTERN = /^[a-zA-Z0-9._/-]+$/; // For HEAD, branch names, tags
const SAFE_FILENAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const SAFE_PATH_PATTERN = /^[a-zA-Z0-9._/-]+$/;

/**
 * Validates if a string is a valid git commit hash or reference
 */
export function isValidCommitHash(hash: string): boolean {
  if (typeof hash !== 'string' || hash.length === 0) {
    return false;
  }
  
  // Allow common Git references
  const commonRefs = ['HEAD', 'ORIG_HEAD', 'FETCH_HEAD', 'MERGE_HEAD'];
  if (commonRefs.includes(hash)) {
    return true;
  }
  
  // Allow commit hashes (7-40 hex characters)
  if (COMMIT_HASH_PATTERN.test(hash)) {
    return true;
  }
  
  // Allow branch names, tags, and other references (basic validation)
  if (hash.length <= 100 && GIT_REFERENCE_PATTERN.test(hash)) {
    return true;
  }
  
  return false;
}

/**
 * Validates if a filename is safe (no path traversal)
 */
export function isValidFilename(filename: string): boolean {
  if (!filename || typeof filename !== 'string') return false;
  
  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  
  return SAFE_FILENAME_PATTERN.test(filename);
}

/**
 * Validates if a path is safe and within allowed boundaries
 */
export function isValidPath(inputPath: string, basePath: string): boolean {
  if (!inputPath || typeof inputPath !== 'string') return false;
  
  try {
    const resolvedPath = path.resolve(basePath, inputPath);
    const resolvedBase = path.resolve(basePath);
    
    // Ensure the resolved path is within the base path
    return resolvedPath.startsWith(resolvedBase);
  } catch (error) {
    return false;
  }
}

/**
 * Sanitizes user input to prevent command injection
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove potentially dangerous characters
  return input
    .replace(/[;&|`$(){}[\]]/g, '')
    .replace(/\.\./g, '')
    .trim();
}

/**
 * Validates git log parameters
 */
export const GitLogParamsSchema = z.object({
  limit: z.number().min(1).max(1000).optional(),
  since: z.string().optional(),
  until: z.string().optional(),
  author: z.string().max(100).optional()
}).refine(data => {
  // Additional validation for date formats if provided
  if (data.since) {
    const sinceDate = new Date(data.since);
    if (isNaN(sinceDate.getTime())) return false;
  }
  if (data.until) {
    const untilDate = new Date(data.until);
    if (isNaN(untilDate.getTime())) return false;
  }
  return true;
}, {
  message: 'Invalid date format in since or until parameters'
});

/**
 * Validates git diff parameters
 */
export const GitDiffParamsSchema = z.object({
  commitHash: z.string().optional(),
  fromCommit: z.string().optional(),
  toCommit: z.string().optional(),
  filePath: z.string().optional()
}).refine(data => {
  // Validate commit hashes if provided
  if (data.commitHash && !isValidCommitHash(data.commitHash)) return false;
  if (data.fromCommit && !isValidCommitHash(data.fromCommit)) return false;
  if (data.toCommit && !isValidCommitHash(data.toCommit)) return false;
  
  return true;
}, {
  message: 'Invalid commit hash format'
});

/**
 * Validates analyze commit parameters
 */
export const AnalyzeCommitParamsSchema = z.object({
  commitHash: z.string().refine(isValidCommitHash, {
    message: 'Invalid commit hash format'
  }),
  generateSummary: z.boolean().optional(),
  outputFile: z.string().optional().refine(filename => {
    return !filename || isValidFilename(filename);
  }, {
    message: 'Invalid output filename'
  })
});

/**
 * Ensures a directory exists and is writable
 */
export async function ensureSafeDirectory(dirPath: string): Promise<boolean> {
  try {
    await fs.ensureDir(dirPath);
    
    // Test write permissions
    const testFile = path.join(dirPath, '.write-test');
    await fs.writeFile(testFile, 'test');
    await fs.remove(testFile);
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validates OpenRouter API key format
 */
export function isValidApiKey(apiKey: string): boolean {
  return typeof apiKey === 'string' && 
         apiKey.length > 10 && 
         apiKey.startsWith('sk-') &&
         /^sk-[a-zA-Z0-9-_]+$/.test(apiKey);
}

/**
 * Validates model ID format
 */
export function isValidModelId(modelId: string): boolean {
  return typeof modelId === 'string' && 
         modelId.length > 0 && 
         /^[a-zA-Z0-9/_-]+$/.test(modelId);
}

/**
 * Rate limiting for API calls
 */
export class RateLimiter {
  private calls: number[] = [];
  private readonly maxCalls: number;
  private readonly timeWindow: number;

  constructor(maxCalls: number = 10, timeWindowMs: number = 60000) {
    this.maxCalls = maxCalls;
    this.timeWindow = timeWindowMs;
  }

  canMakeCall(): boolean {
    const now = Date.now();
    
    // Remove old calls outside the time window
    this.calls = this.calls.filter(callTime => now - callTime < this.timeWindow);
    
    if (this.calls.length >= this.maxCalls) {
      return false;
    }
    
    this.calls.push(now);
    return true;
  }

  getTimeUntilNextCall(): number {
    if (this.calls.length < this.maxCalls) return 0;
    
    const oldestCall = Math.min(...this.calls);
    return Math.max(0, this.timeWindow - (Date.now() - oldestCall));
  }
}