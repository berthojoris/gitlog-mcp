import axios, { AxiosInstance } from 'axios';
import { OpenRouterRequest, OpenRouterResponse, OpenRouterMessage } from './types.js';
import { RateLimiter } from './security.js';

/**
 * OpenRouter API client for AI-powered git analysis
 */
export class OpenRouterClient {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;
  private modelId: string;

  constructor(apiKey: string, modelId: string) {
    this.modelId = modelId;
    this.rateLimiter = new RateLimiter(10, 60000); // 10 calls per minute

    this.client = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/gitlogmcp/gitlogmcp',
        'X-Title': 'GitLogMCP'
      },
      timeout: 30000
    });
  }

  /**
   * Analyzes git changes and provides insights in Indonesian
   */
  async analyzeCommitChanges(
    commitHash: string,
    commitMessage: string,
    authorName: string,
    filesChanged: string[],
    diffContent: string
  ): Promise<string> {
    if (!this.rateLimiter.canMakeCall()) {
      const waitTime = this.rateLimiter.getTimeUntilNextCall();
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    const systemPrompt = `You are an experienced code analysis expert specializing in analyzing git repository changes. 
Your task is to analyze git commits and provide comprehensive summaries in English.

Provide analysis that includes:
1. Summary of changes made
2. Files affected and their impact
3. Purpose of the changes
4. Potential impact on the overall project
5. Recommendations or things to note

Format your response in clean and readable markdown.`;

    const userPrompt = `Analyze the following commit:

**Commit Hash:** ${commitHash}
**Commit Message:** ${commitMessage}
**Author:** ${authorName}
**Files Changed:** ${filesChanged.join(', ')}

**Diff Content:**
\`\`\`diff
${diffContent.substring(0, 8000)} ${diffContent.length > 8000 ? '...(truncated)' : ''}
\`\`\`

Provide a comprehensive analysis in English about these changes and their impact on the project.`;

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const request: OpenRouterRequest = {
      model: this.modelId,
      messages,
      max_tokens: 2000,
      temperature: 0.3
    };

    try {
      const response = await this.client.post<OpenRouterResponse>('/chat/completions', request);
      
      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('No response from OpenRouter API');
      }

      return response.data.choices[0].message.content;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        
        if (status === 401) {
          throw new Error('Invalid OpenRouter API key');
        } else if (status === 429) {
          throw new Error('OpenRouter API rate limit exceeded');
        } else if (status === 400) {
          throw new Error(`Invalid request to OpenRouter: ${message}`);
        } else {
          throw new Error(`OpenRouter API error (${status}): ${message}`);
        }
      }
      
      throw new Error(`Failed to analyze commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates a project impact summary for multiple commits
   */
  async generateProjectImpactSummary(
    commits: Array<{
      hash: string;
      message: string;
      author: string;
      authorEmail: string;
      date: string;
      refs?: string;
      filesChanged: string[];
    }>,
    projectContext?: string
  ): Promise<string> {
    if (!this.rateLimiter.canMakeCall()) {
      const waitTime = this.rateLimiter.getTimeUntilNextCall();
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    const systemPrompt = `You are a software project analyst. Your task is to create a simple, numbered list of commits with their details and impact summary.

For each commit, provide EXACTLY this format:

1. commit [full_hash] ([refs_if_any])
Author: [Author Name] <[author_email]>
Date:   [formatted_date]
Summary: [A brief summary of the changes made to that commit ID. The files where the changes or additions are made will have an impact everywhere in the project.]
File changes: [List the files that were modified, added, or deleted in this commit]

2. commit [full_hash] ([refs_if_any])
Author: [Author Name] <[author_email]>
Date:   [formatted_date]
Summary: [A brief summary of the changes made to that commit ID. The files where the changes or additions are made will have an impact everywhere in the project.]
File changes: [List the files that were modified, added, or deleted in this commit]

IMPORTANT RULES:
- Use EXACTLY the format shown above
- Number each commit sequentially (1, 2, 3, etc.)
- Include the full commit hash
- Include refs in parentheses if available (like HEAD -> master, origin/master, origin/HEAD)
- If no refs available, use (none)
- Keep summaries concise but informative in ENGLISH language only
- Focus on the impact of file changes on the project
- For File changes section, list the actual files that were modified/added/deleted
- Do not add any additional text, headers, or explanations outside this format`;

    const commitsInfo = commits.map(commit => {
      const date = new Date(commit.date);
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ', ' + date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }) + ' GMT+7';
      
      return `Commit: ${commit.hash}
Author: ${commit.author} <${commit.authorEmail}>
Date: ${formattedDate}
Refs: ${commit.refs || 'none'}
Message: ${commit.message}
Files Changed: ${commit.filesChanged.join(', ')}`;
    }).join('\n\n');

    const userPrompt = `Generate a simple numbered list for the following commits:

${commitsInfo}

${projectContext ? `\nProject Context: ${projectContext}` : ''}

Create the numbered list following the exact format specified in the system prompt.`;

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const request: OpenRouterRequest = {
      model: this.modelId,
      messages,
      max_tokens: 1500,
      temperature: 0.3
    };

    try {
      const response = await this.client.post<OpenRouterResponse>('/chat/completions', request);
      
      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('No response from OpenRouter API');
      }

      return response.data.choices[0].message.content;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        
        throw new Error(`OpenRouter API error (${status}): ${message}`);
      }
      
      throw new Error(`Failed to generate project impact summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Tests the connection to OpenRouter API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/models');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}