#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import fs from 'fs-extra';
import { GitService } from './git-service.js';
import { OpenRouterClient } from './openrouter.js';
import { Config, ConfigSchema, CommitAnalysis } from './types.js';
import {
  isValidApiKey,
  isValidModelId,
  ensureSafeDirectory,
  AnalyzeCommitParamsSchema,
  GitLogParamsSchema,
  GitDiffParamsSchema
} from './security.js';

/**
 * GitLogMCP Server - MCP server for Git repository analysis with AI integration
 */
class GitLogMCPServer {
  private server: Server;
  private gitService: GitService;
  private openRouterClient: OpenRouterClient | null = null;
  private config: Config;

  constructor() {
    this.server = new Server(
      {
        name: 'gitlogmcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Parse command line arguments for configuration
    this.config = this.parseConfig();
    
    // Initialize services
    this.gitService = new GitService(this.config.repositoryPath);
    
    if (this.config.openRouterApiKey && this.config.modelId) {
      this.openRouterClient = new OpenRouterClient(
        this.config.openRouterApiKey,
        this.config.modelId
      );
    }

    this.setupHandlers();
  }

  private parseConfig(): Config {
    const args = process.argv.slice(2);

    // Check for help flag
    if (args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      process.exit(0);
    }

    const configData: any = {};

    // Parse command line arguments
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i];
      const value = args[i + 1];

      switch (key) {
      case '--api-key':
        configData.openRouterApiKey = value;
        break;
      case '--model-id':
        configData.modelId = value;
        break;
      case '--repo-path':
        configData.repositoryPath = value;
        break;
      case '--output-dir':
        configData.outputDir = value;
        break;
      case '--max-commits':
        configData.maxCommits = parseInt(value, 10);
        break;
      case '--language':
        configData.language = value;
        break;
      default:
        if (key.startsWith('--')) {
          console.warn(`Unknown argument: ${key}`);
        }
      }
    }

    try {
      return ConfigSchema.parse(configData);
    } catch (error) {
      console.error('Configuration validation failed:', error);
      console.error('\nUse --help for usage information.');
      process.exit(1);
    }
  }

  private showHelp(): void {
    console.log(`
GitLogMCP - Model Context Protocol server for Git repository analysis

Usage: node build/index.js [options]

Options:
  --api-key <key>       OpenRouter API key (required for AI analysis)
  --model-id <id>       OpenRouter model ID (required for AI analysis)
  --repo-path <path>    Path to Git repository (default: current directory)
  --output-dir <path>   Output directory for summaries (default: ./summaries)
  --max-commits <num>   Maximum commits to retrieve (default: 100)
  --language <lang>     Analysis language: en|id (default: id)
  --help, -h            Show this help message

Examples:
  # Basic usage (uses current directory as repository)
  node build/index.js

  # With specific repository path
  node build/index.js --repo-path /path/to/repo

  # With AI analysis
  node build/index.js --api-key sk-or-v1-xxx --model-id anthropic/claude-3-sonnet

  # Full configuration
  node build/index.js \\
    --api-key sk-or-v1-xxx \\
    --model-id anthropic/claude-3-sonnet \\
    --repo-path /path/to/repo \\
    --output-dir ./summaries \\
    --max-commits 50 \\
    --language id

Note: AI-powered analysis features require both --api-key and --model-id
`);
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'git_log',
          description: 'Get git commit history with optional filtering',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Maximum number of commits to return (default: 50, max: 1000)',
                minimum: 1,
                maximum: 1000
              },
              since: {
                type: 'string',
                description: 'Show commits since this date (ISO format)'
              },
              until: {
                type: 'string',
                description: 'Show commits until this date (ISO format)'
              },
              author: {
                type: 'string',
                description: 'Filter commits by author name'
              }
            }
          }
        },
        {
          name: 'git_diff',
          description: 'Get git diff for commits or files',
          inputSchema: {
            type: 'object',
            properties: {
              commitHash: {
                type: 'string',
                description: 'Show diff for this specific commit'
              },
              fromCommit: {
                type: 'string',
                description: 'Starting commit for diff comparison'
              },
              toCommit: {
                type: 'string',
                description: 'Ending commit for diff comparison'
              },
              filePath: {
                type: 'string',
                description: 'Show diff for specific file only'
              }
            }
          }
        },
        {
          name: 'commit_info',
          description: 'Get detailed information about a specific commit including author and message',
          inputSchema: {
            type: 'object',
            properties: {
              commitHash: {
                type: 'string',
                description: 'The commit hash or reference (e.g., HEAD, branch name) to get information for'
              }
            },
            required: ['commitHash']
          }
        },
        {
          name: 'analyze_commit',
          description: 'Analyze a commit using AI and generate insights in the configured language',
          inputSchema: {
            type: 'object',
            properties: {
              commitHash: {
                type: 'string',
                description: 'The commit hash or reference (e.g., HEAD, branch name) to analyze'
              },
              generateSummary: {
                type: 'boolean',
                description: 'Whether to generate a markdown summary file',
                default: false
              },
              outputFile: {
                type: 'string',
                description: 'Custom filename for the summary (without extension)'
              }
            },
            required: ['commitHash']
          }
        },
        {
          name: 'repository_stats',
          description: 'Get repository statistics including total commits, authors, and branches',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'list_authors',
          description: 'Get list of all authors who have committed to the repository',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'generate_project_summary',
          description: 'Generate AI-powered project impact summary for recent commits',
          inputSchema: {
            type: 'object',
            properties: {
              commitCount: {
                type: 'number',
                description: 'Number of recent commits to analyze (default: 10, max: 50)',
                minimum: 1,
                maximum: 50,
                default: 10
              },
              outputFile: {
                type: 'string',
                description: 'Custom filename for the summary (without extension)'
              }
            }
          }
        }
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
        case 'git_log':
          return await this.handleGitLog(args);
          
        case 'git_diff':
          return await this.handleGitDiff(args);
          
        case 'commit_info':
          return await this.handleCommitInfo(args);
          
        case 'analyze_commit':
          if (!this.openRouterClient) {
            throw new Error('AI analysis not available. Please configure OpenRouter API key and model ID to use this feature.');
          }
          return await this.handleAnalyzeCommit(args);
          
        case 'repository_stats':
          return await this.handleRepositoryStats();
          
        case 'list_authors':
          return await this.handleListAuthors();
          
        case 'generate_project_summary':
          if (!this.openRouterClient) {
            throw new Error('AI analysis not available. Please configure OpenRouter API key and model ID to use this feature.');
          }
          return await this.handleGenerateProjectSummary(args);
          
        default:
          throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ]
        };
      }
    });
  }

  private async handleGitLog(args: any) {
    const params = GitLogParamsSchema.parse(args || {});
    const commits = await this.gitService.getGitLog(params);

    const content = commits.map(commit => 
      `**${commit.hash.substring(0, 8)}** - ${commit.message}\n` +
      `Author: ${commit.author.name} <${commit.author.email}>\n` +
      `Date: ${commit.date}\n` +
      `${commit.refs ? `Refs: ${commit.refs}\n` : ''}\n`
    ).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `# Git Log (${commits.length} commits)\n\n${content}`
        }
      ]
    };
  }

  private async handleGitDiff(args: any) {
    const params = GitDiffParamsSchema.parse(args || {});
    const diffs = await this.gitService.getGitDiff(params);

    if (diffs.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No differences found.'
          }
        ]
      };
    }

    const content = diffs.map(diff => 
      `## ${diff.file}\n` +
      `**Changes:** ${diff.changes} (+${diff.insertions}/-${diff.deletions})\n\n` +
      `\`\`\`diff\n${diff.diff}\n\`\`\``
    ).join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `# Git Diff\n\n${content}`
        }
      ]
    };
  }

  private async handleCommitInfo(args: any) {
    const { commitHash } = args;
    const commitInfo = await this.gitService.getCommitInfo(commitHash);

    const content = '# Commit Information\n\n' +
      `**Hash:** ${commitInfo.hash}\n` +
      `**Author:** ${commitInfo.author.name} <${commitInfo.author.email}>\n` +
      `**Date:** ${commitInfo.date}\n` +
      `**Message:**\n${commitInfo.message}\n\n` +
      `**Files Changed (${commitInfo.filesChanged.length}):**\n` +
      commitInfo.filesChanged.map(file => `- ${file}`).join('\n') + '\n\n' +
      `**Diff:**\n\`\`\`diff\n${commitInfo.diff}\n\`\`\``;

    return {
      content: [
        {
          type: 'text',
          text: content
        }
      ]
    };
  }

  private async handleAnalyzeCommit(args: any) {
    const params = AnalyzeCommitParamsSchema.parse(args);
    
    if (!this.openRouterClient) {
      throw new Error('OpenRouter client not configured. Please provide API key and model ID.');
    }

    const commitInfo = await this.gitService.getCommitInfo(params.commitHash);
    
    const analysis = await this.openRouterClient.analyzeCommitChanges(
      commitInfo.hash,
      commitInfo.message,
      commitInfo.author.name,
      commitInfo.filesChanged,
      commitInfo.diff
    );

    let content = `# Analisis Commit: ${commitInfo.hash.substring(0, 8)}\n\n${analysis}`;

    // Generate summary file if requested
    if (params.generateSummary) {
      await ensureSafeDirectory(this.config.outputDirectory);
      
      const filename = params.outputFile || 
        `commit-${commitInfo.hash.substring(0, 8)}-${Date.now()}`;
      const filepath = path.join(this.config.outputDirectory, `${filename}.md`);
      
      const summaryContent = `# Analisis Commit: ${commitInfo.hash}\n\n` +
        `**Tanggal:** ${new Date().toLocaleString('id-ID')}\n` +
        `**Commit Hash:** ${commitInfo.hash}\n` +
        `**Author:** ${commitInfo.author.name}\n` +
        `**Pesan Commit:** ${commitInfo.message}\n\n` +
        `## Analisis\n\n${analysis}`;
      
      await fs.writeFile(filepath, summaryContent, 'utf8');
      content += `\n\n**Summary saved to:** ${filepath}`;
    }

    return {
      content: [
        {
          type: 'text',
          text: content
        }
      ]
    };
  }

  private async handleRepositoryStats() {
    const stats = await this.gitService.getRepositoryStats();

    const content = '# Repository Statistics\n\n' +
      `**Total Commits:** ${stats.totalCommits}\n` +
      `**Total Authors:** ${stats.totalAuthors}\n` +
      `**First Commit:** ${stats.firstCommit}\n` +
      `**Last Commit:** ${stats.lastCommit}\n` +
      `**Branches:** ${stats.branches.join(', ')}\n` +
      `**Repository Path:** ${this.gitService.getRepositoryPath()}`;

    return {
      content: [
        {
          type: 'text',
          text: content
        }
      ]
    };
  }

  private async handleListAuthors() {
    const authors = await this.gitService.getAuthors();

    const content = '# Repository Authors\n\n' +
      authors.map((author, index) => 
        `${index + 1}. **${author.name}** <${author.email}> - ${author.commits} commits`
      ).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: content
        }
      ]
    };
  }

  private async handleGenerateProjectSummary(args: any) {
    const { commitCount = 10, outputFile } = args;
    
    if (!this.openRouterClient) {
      throw new Error('OpenRouter client not configured. Please provide API key and model ID.');
    }

    const commits = await this.gitService.getGitLog({ limit: commitCount });
    
    if (commits.length === 0) {
      throw new Error('No commits found in repository');
    }

    // Get detailed info for each commit including diff content
    const commitDetails = await Promise.all(
      commits.map(async commit => {
        const info = await this.gitService.getCommitInfo(commit.hash);
        return {
          hash: commit.hash,
          message: commit.message,
          author: commit.author.name,
          authorEmail: commit.author.email,
          date: commit.date,
          refs: commit.refs,
          filesChanged: info.filesChanged,
          diffContent: info.diff
        };
      })
    );

    const summary = await this.openRouterClient.generateProjectImpactSummary(commitDetails);

    let content = `# Ringkasan Dampak Proyek\n\n${summary}`;

    // Generate summary file if requested
    if (outputFile || true) { // Always generate file for project summaries
      await ensureSafeDirectory(this.config.outputDirectory);
      
      const filename = outputFile || `project-summary-${Date.now()}`;
      const filepath = path.join(this.config.outputDirectory, `${filename}.md`);
      
      const summaryContent = '# Ringkasan Dampak Proyek\n\n' +
        `**Tanggal:** ${new Date().toLocaleString('id-ID')}\n` +
        `**Commits Dianalisis:** ${commitCount}\n` +
        `**Repository:** ${this.gitService.getRepositoryPath()}\n\n` +
        `## Ringkasan\n\n${summary}`;
      
      await fs.writeFile(filepath, summaryContent, 'utf8');
      content += `\n\n**Summary saved to:** ${filepath}`;
    }

    return {
      content: [
        {
          type: 'text',
          text: content
        }
      ]
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GitLogMCP server running on stdio');
  }
}

// Start the server
const server = new GitLogMCPServer();
server.run().catch(console.error);