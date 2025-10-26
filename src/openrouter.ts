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

    const systemPrompt = `Anda adalah seorang ahli analisis kode yang berpengalaman dalam menganalisis perubahan git repository. 
Tugas Anda adalah menganalisis commit git dan memberikan ringkasan yang komprehensif dalam bahasa Indonesia.

Berikan analisis yang mencakup:
1. Ringkasan perubahan yang dilakukan
2. File-file yang terpengaruh dan dampaknya
3. Tujuan dari perubahan tersebut
4. Potensi dampak terhadap proyek secara keseluruhan
5. Rekomendasi atau hal-hal yang perlu diperhatikan

Format jawaban dalam markdown yang rapi dan mudah dibaca.`;

    const userPrompt = `Analisis commit berikut:

**Commit Hash:** ${commitHash}
**Commit Message:** ${commitMessage}
**Author:** ${authorName}
**Files Changed:** ${filesChanged.join(', ')}

**Diff Content:**
\`\`\`diff
${diffContent.substring(0, 8000)} ${diffContent.length > 8000 ? '...(truncated)' : ''}
\`\`\`

Berikan analisis lengkap dalam bahasa Indonesia tentang perubahan ini dan dampaknya terhadap proyek.`;

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

2. commit [full_hash] ([refs_if_any])
Author: [Author Name] <[author_email]>
Date:   [formatted_date]
Summary: [A brief summary of the changes made to that commit ID. The files where the changes or additions are made will have an impact everywhere in the project.]

IMPORTANT RULES:
- Use EXACTLY the format shown above
- Number each commit sequentially (1, 2, 3, etc.)
- Include the full commit hash
- Include refs in parentheses if available (like HEAD -> master, origin/master)
- Keep summaries concise but informative
- Focus on the impact of file changes on the project
- Do not add any additional text, headers, or explanations outside this format`;

    const commitsInfo = commits.map(commit => {
      const formattedDate = new Date(commit.date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        year: 'numeric',
        timeZoneName: 'short'
      });
      
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