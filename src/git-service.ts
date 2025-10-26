import simpleGit, { SimpleGit, LogResult, DiffResult } from 'simple-git';
import path from 'path';
import fs from 'fs-extra';
import { GitCommit, GitDiff, GitLogParams, GitDiffParams } from './types.js';
import { 
  isValidCommitHash, 
  isValidPath, 
  sanitizeInput,
  GitLogParamsSchema,
  GitDiffParamsSchema
} from './security.js';

/**
 * Git service for handling repository operations
 */
export class GitService {
  private git: SimpleGit;
  private repositoryPath: string;

  constructor(repositoryPath?: string) {
    this.repositoryPath = repositoryPath || process.cwd();
    this.git = simpleGit(this.repositoryPath);
  }

  /**
   * Validates if the current directory is a git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets git log with optional parameters
   */
  async getGitLog(params: GitLogParams = {}): Promise<GitCommit[]> {
    // Validate parameters
    const validatedParams = GitLogParamsSchema.parse(params);
    
    if (!await this.isGitRepository()) {
      throw new Error('Current directory is not a git repository');
    }

    try {
      const options: any = {
        maxCount: validatedParams.limit || 50,
        format: {
          hash: '%H',
          date: '%ai',
          message: '%s',
          author_name: '%an',
          author_email: '%ae',
          refs: '%D'
        }
      };

      if (validatedParams.since) {
        options.since = validatedParams.since;
      }

      if (validatedParams.until) {
        options.until = validatedParams.until;
      }

      if (validatedParams.author) {
        options.author = sanitizeInput(validatedParams.author);
      }

      const logResult: LogResult = await this.git.log(options);

      return logResult.all.map(commit => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author: {
          name: commit.author_name,
          email: commit.author_email
        },
        refs: commit.refs
      }));
    } catch (error) {
      throw new Error(`Failed to get git log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets git diff for a specific commit or between commits
   */
  async getGitDiff(params: GitDiffParams = {}): Promise<GitDiff[]> {
    // Validate parameters
    const validatedParams = GitDiffParamsSchema.parse(params);

    if (!await this.isGitRepository()) {
      throw new Error('Current directory is not a git repository');
    }

    try {
      const diffOptions: string[] = ['--numstat'];
      let diffCommand: string[] = [];

      if (validatedParams.commitHash) {
        // Show diff for a specific commit
        diffCommand = [validatedParams.commitHash + '^', validatedParams.commitHash];
      } else if (validatedParams.fromCommit && validatedParams.toCommit) {
        // Show diff between two commits
        diffCommand = [validatedParams.fromCommit, validatedParams.toCommit];
      } else {
        // Show diff for the last commit
        diffCommand = ['HEAD^', 'HEAD'];
      }

      if (validatedParams.filePath) {
        const safePath = sanitizeInput(validatedParams.filePath);
        if (!isValidPath(safePath, this.repositoryPath)) {
          throw new Error('Invalid file path');
        }
        diffCommand.push('--', safePath);
      }

      // Get numerical stats
      const numStatResult = await this.git.diff([...diffOptions, ...diffCommand]);
      
      // Get actual diff content
      const diffResult = await this.git.diff(diffCommand);

      const diffs: GitDiff[] = [];
      const lines = numStatResult.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          const insertions = parseInt(parts[0]) || 0;
          const deletions = parseInt(parts[1]) || 0;
          const file = parts[2];

          diffs.push({
            file,
            changes: insertions + deletions,
            insertions,
            deletions,
            diff: diffResult
          });
        }
      }

      return diffs;
    } catch (error) {
      throw new Error(`Failed to get git diff: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets detailed information about a specific commit
   */
  async getCommitInfo(commitHash: string): Promise<GitCommit & { filesChanged: string[]; diff: string }> {
    // Allow HEAD and other git references in addition to commit hashes
    if (!isValidCommitHash(commitHash) && commitHash !== 'HEAD' && !commitHash.match(/^[a-zA-Z0-9_\-\/]+$/)) {
      throw new Error('Invalid commit hash or reference format');
    }

    if (!await this.isGitRepository()) {
      throw new Error('Current directory is not a git repository');
    }

    try {
      // Get commit information - use git log with specific commit
      const logResult = await this.git.raw(['log', '-1', '--pretty=format:%H|%ai|%B|%an|%ae|%D', commitHash]);
      
      if (!logResult.trim()) {
        throw new Error('Commit not found');
      }

      const parts = logResult.trim().split('|');
      if (parts.length < 6) {
        throw new Error('Invalid commit format');
      }

      const commit = {
        hash: parts[0],
        date: parts[1],
        message: parts[2].trim(),
        author: {
          name: parts[3],
          email: parts[4]
        },
        refs: parts[5] || ''
      };

      // Get files changed in this commit
      let filesChanged: string[] = [];
      let diffResult = '';
      
      try {
        // Try to get diff with parent commit
        const filesResult = await this.git.diff(['--name-only', commitHash + '^', commitHash]);
        filesChanged = filesResult.split('\n').filter(file => file.trim());
        
        // Get diff for this commit
        diffResult = await this.git.diff([commitHash + '^', commitHash]);
      } catch (error) {
        // Handle initial commit (no parent)
        try {
          const filesResult = await this.git.raw(['show', '--name-only', '--pretty=format:', commitHash]);
          filesChanged = filesResult.split('\n').filter(file => file.trim());
          
          // Get diff for initial commit
          diffResult = await this.git.raw(['show', commitHash]);
        } catch (showError) {
          // Fallback: empty arrays for problematic commits
          filesChanged = [];
          diffResult = 'Unable to retrieve diff for this commit';
        }
      }

      return {
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author: commit.author,
        refs: commit.refs,
        filesChanged,
        diff: diffResult
      };
    } catch (error) {
      throw new Error(`Failed to get commit info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets the list of authors who have committed to the repository
   */
  async getAuthors(): Promise<Array<{ name: string; email: string; commits: number }>> {
    if (!await this.isGitRepository()) {
      throw new Error('Current directory is not a git repository');
    }

    try {
      const result = await this.git.raw(['shortlog', '-sne', '--all']);
      const lines = result.split('\n').filter(line => line.trim());
      
      const authors = lines.map(line => {
        const match = line.match(/^\s*(\d+)\s+(.+)\s+<(.+)>$/);
        if (match) {
          return {
            commits: parseInt(match[1]),
            name: match[2].trim(),
            email: match[3].trim()
          };
        }
        return null;
      }).filter(author => author !== null) as Array<{ name: string; email: string; commits: number }>;

      return authors.sort((a, b) => b.commits - a.commits);
    } catch (error) {
      throw new Error(`Failed to get authors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets repository statistics
   */
  async getRepositoryStats(): Promise<{
    totalCommits: number;
    totalAuthors: number;
    firstCommit: string;
    lastCommit: string;
    branches: string[];
  }> {
    if (!await this.isGitRepository()) {
      throw new Error('Current directory is not a git repository');
    }

    try {
      // Get total commits
      const totalCommitsResult = await this.git.raw(['rev-list', '--count', 'HEAD']);
      const totalCommits = parseInt(totalCommitsResult.trim());

      // Get authors
      const authors = await this.getAuthors();
      const totalAuthors = authors.length;

      // Get first and last commit
      const firstCommitResult = await this.git.raw(['rev-list', '--max-parents=0', 'HEAD']);
      const firstCommit = firstCommitResult.trim().split('\n')[0];

      const lastCommitResult = await this.git.raw(['rev-parse', 'HEAD']);
      const lastCommit = lastCommitResult.trim();

      // Get branches
      const branchesResult = await this.git.branch(['-a']);
      const branches = branchesResult.all.filter(branch => !branch.startsWith('remotes/'));

      return {
        totalCommits,
        totalAuthors,
        firstCommit,
        lastCommit,
        branches
      };
    } catch (error) {
      throw new Error(`Failed to get repository stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates if a commit exists in the repository
   */
  async commitExists(commitHash: string): Promise<boolean> {
    if (!isValidCommitHash(commitHash)) {
      return false;
    }

    try {
      await this.git.raw(['cat-file', '-e', commitHash]);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the current repository path
   */
  getRepositoryPath(): string {
    return this.repositoryPath;
  }

  /**
   * Sets a new repository path
   */
  setRepositoryPath(newPath: string): void {
    if (!isValidPath(newPath, process.cwd())) {
      throw new Error('Invalid repository path');
    }
    
    this.repositoryPath = path.resolve(newPath);
    this.git = simpleGit(this.repositoryPath);
  }
}