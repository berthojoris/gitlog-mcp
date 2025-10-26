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
      date: string;
      filesChanged: string[];
    }>,
    projectContext?: string
  ): Promise<string> {
    if (!this.rateLimiter.canMakeCall()) {
      const waitTime = this.rateLimiter.getTimeUntilNextCall();
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    const systemPrompt = `Anda adalah seorang ahli analisis proyek software yang berpengalaman dalam menganalisis dampak perubahan kode terhadap proyek secara keseluruhan.

Tugas Anda adalah menganalisis serangkaian commit dan memberikan ringkasan dampak terhadap proyek dalam bahasa Indonesia.

Berikan analisis yang mencakup:
1. Ringkasan umum perubahan yang terjadi
2. Area utama yang terpengaruh
3. Dampak terhadap fungsionalitas proyek
4. Potensi risiko atau masalah
5. Rekomendasi untuk pengembangan selanjutnya

PENTING: Dalam ringkasan, pastikan untuk menyebutkan informasi commit dengan format:
- **Commit [hash pendek] ([tanggal])**: "[pesan commit]" - oleh [nama author]

Format jawaban dalam markdown yang rapi dan terstruktur.`;

    const commitsInfo = commits.map(commit => {
      const formattedDate = new Date(commit.date).toLocaleString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      return `- **${commit.hash.substring(0, 8)}**: "${commit.message}" - **${commit.author}** pada ${formattedDate} - Files: ${commit.filesChanged.join(', ')}`;
    }).join('\n');

    const userPrompt = `Analisis dampak proyek dari commit-commit berikut:

${projectContext ? `**Konteks Proyek:** ${projectContext}\n\n` : ''}**Commits yang dianalisis:**
${commitsInfo}

Berikan analisis komprehensif tentang dampak perubahan-perubahan ini terhadap proyek secara keseluruhan dalam bahasa Indonesia.`;

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