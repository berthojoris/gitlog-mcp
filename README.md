# GitLogMCP - Git Repository Analysis with AI Integration

GitLogMCP is a Model Context Protocol (MCP) server that provides comprehensive git repository analysis capabilities with AI-powered insights using OpenRouter. This tool allows you to analyze git commits, track changes, and generate intelligent summaries in Indonesian.

## Features

### 🔍 Git Operations
- **Git Log**: Retrieve commit history with flexible filtering options
- **Git Diff**: Show differences between commits or specific files
- **Commit Information**: Get detailed commit data including author, message, and file changes
- **Repository Statistics**: Overview of repository metrics and authors
- **Author Listing**: Complete list of contributors with commit counts

### 🤖 AI-Powered Analysis
- **Commit Analysis**: AI-powered analysis of individual commits in Indonesian
- **Project Impact Summary**: Generate comprehensive project impact reports
- **Intelligent Insights**: Understand the purpose and impact of code changes
- **Markdown Reports**: Automatically generated summary files

### 🔒 Security Features
- **Input Validation**: Comprehensive validation to prevent injection attacks
- **Path Traversal Protection**: Safe file and directory handling
- **Rate Limiting**: Built-in API rate limiting for OpenRouter calls
- **Secure Configuration**: Safe handling of API keys and sensitive data

## Installation

### Prerequisites
- Node.js 18.0.0 or higher
- Git repository (the tool analyzes the current working directory)
- OpenRouter API key and model access

### Setup

1. **Clone or download the project:**
```bash
git clone <repository-url>
cd gitlogmcp
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build the project:**
```bash
npm run build
```

4. **Get OpenRouter API Key:**
   - Visit [OpenRouter](https://openrouter.ai/)
   - Create an account and get your API key
   - Choose a model ID (e.g., `anthropic/claude-3-sonnet`, `openai/gpt-4`)

## Configuration

### MCP Client Configuration

Add the following configuration to your MCP client (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "gitlogmcp": {
      "command": "node",
      "args": [
        "path/to/gitlogmcp/build/index.js",
        "--api-key", "your-openrouter-api-key",
        "--model-id", "anthropic/claude-3-sonnet",
        "--output-dir", "./summaries",
        "--max-commits", "100",
        "--language", "id"
      ]
    }
  }
}
```

### Configuration Parameters

| Parameter | Description | Required | Default |
|-----------|-------------|----------|---------|
| `--api-key` | OpenRouter API key | Yes | - |
| `--model-id` | OpenRouter model ID | Yes | - |
| `--repo-path` | Path to git repository | No | Current directory |
| `--output-dir` | Directory for summary files (auto-created if needed) | No | `./summaries` |
| `--max-commits` | Maximum commits to process | No | `100` |
| `--language` | Analysis language (en/id) | No | `id` |

> **Note:** The output directory specified by `--output-dir` will be automatically created if it doesn't exist, including any necessary parent directories. The system also verifies write permissions after creation.

### Example Configuration for Different Scenarios

#### For Claude Desktop (Windows):
```json
{
  "mcpServers": {
    "gitlogmcp": {
      "command": "node",
      "args": [
        "C:\\path\\to\\gitlogmcp\\build\\index.js",
        "--api-key", "sk-or-v1-your-api-key-here",
        "--model-id", "anthropic/claude-3-sonnet"
      ]
    }
  }
}
```

#### With Custom Repository Path:
```json
{
  "mcpServers": {
    "gitlogmcp": {
      "command": "node",
      "args": [
        "C:\\path\\to\\gitlogmcp\\build\\index.js",
        "--api-key", "sk-or-v1-your-api-key-here",
        "--model-id", "anthropic/claude-3-sonnet",
        "--repo-path", "C:\\your\\project\\path"
      ]
    }
  }
}
```

#### For Development Environment:
```json
{
  "mcpServers": {
    "gitlogmcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/gitlogmcp/build/index.js",
        "--api-key", "sk-or-v1-your-api-key-here",
        "--model-id", "openai/gpt-4-turbo",
        "--output-dir", "/path/to/summaries"
      ]
    }
  }
}
```

> **Note:** If `--repo-path` is not specified, the server will automatically use the current working directory as the Git repository. This means you can run the server from within any Git repository without explicitly specifying the path.

## Available Tools

### 1. `git_log`
Retrieve git commit history with optional filtering.

**Parameters:**
- `limit` (number, optional): Maximum commits to return (1-1000, default: 50)
- `since` (string, optional): Show commits since this date (ISO format)
- `until` (string, optional): Show commits until this date (ISO format)
- `author` (string, optional): Filter by author name

**Example:**
```
Get the last 10 commits by John Doe since 2024-01-01
```

### 2. `git_diff`
Show git differences between commits or for specific files.

**Parameters:**
- `commitHash` (string, optional): Show diff for specific commit
- `fromCommit` (string, optional): Starting commit for comparison
- `toCommit` (string, optional): Ending commit for comparison
- `filePath` (string, optional): Show diff for specific file only

**Example:**
```
Show diff between commit abc123 and def456
```

### 3. `commit_info`
Get detailed information about a specific commit.

**Parameters:**
- `commitHash` (string, required): The commit hash to analyze

**Example:**
```
Get information for commit abc123def456
```

### 4. `analyze_commit`
AI-powered analysis of a commit with insights in Indonesian.

**Parameters:**
- `commitHash` (string, required): The commit hash to analyze
- `generateSummary` (boolean, optional): Generate markdown summary file
- `outputFile` (string, optional): Custom filename for summary

**Example:**
```
Analyze commit abc123 and generate a summary file
```

### 5. `repository_stats`
Get comprehensive repository statistics.

**Parameters:** None

**Example:**
```
Show repository statistics
```

### 6. `list_authors`
List all authors who have contributed to the repository.

**Parameters:** None

**Example:**
```
List all repository authors
```

### 7. `generate_project_summary`
Generate AI-powered project impact summary for recent commits.

**Parameters:**
- `commitCount` (number, optional): Number of recent commits to analyze (1-50, default: 10)
- `outputFile` (string, optional): Custom filename for summary

**Example:**
```
Generate project summary for the last 20 commits
```

## Usage Examples

### Basic Git Operations

1. **View Recent Commits:**
   ```
   Use git_log tool to show the last 20 commits
   ```

2. **Check Specific Commit:**
   ```
   Use commit_info tool for commit hash abc123def456
   ```

3. **Compare Commits:**
   ```
   Use git_diff tool to compare commits abc123 and def456
   ```

### AI-Powered Analysis

1. **Analyze Single Commit:**
   ```
   Use analyze_commit tool for commit abc123 with summary generation enabled
   ```

2. **Project Impact Analysis:**
   ```
   Use generate_project_summary tool to analyze the last 15 commits
   ```

3. **Author Analysis:**
   ```
   Use list_authors tool to see all contributors
   ```

## Output Files

The tool generates markdown files in the specified output directory:

### Commit Analysis Files
- **Filename:** `commit-{hash}-{timestamp}.md`
- **Content:** Detailed analysis of individual commits in Indonesian
- **Includes:** Impact assessment, file changes, recommendations

### Project Summary Files
- **Filename:** `project-summary-{timestamp}.md`
- **Content:** Comprehensive project impact analysis
- **Includes:** Overall changes, affected areas, development recommendations

## Security Considerations

### Input Validation
- All commit hashes are validated against regex patterns
- File paths are checked for traversal attacks
- User inputs are sanitized to prevent injection

### API Security
- OpenRouter API keys are handled securely
- Rate limiting prevents API abuse
- No sensitive data is logged or exposed

### File System Security
- Output directories are validated and created safely
- File operations are restricted to designated areas
- Path traversal protection is implemented

## Troubleshooting

### Common Issues

1. **"Not a git repository" Error:**
   - Ensure you're running the tool in a git repository (or specify `--repo-path` to point to one)
   - If not using `--repo-path`, make sure the current directory is a git repository
   - Check that the specified `--repo-path` (if provided) points to a valid git repository

2. **OpenRouter API Errors:**
   - Verify your API key is correct and active
   - Check if the model ID is available
   - Ensure you have sufficient API credits

3. **Permission Errors:**
   - Check write permissions for the output directory
   - Ensure the tool has access to the git repository

4. **Rate Limit Errors:**
   - The tool has built-in rate limiting
   - Wait for the specified time before retrying

### Debug Mode

To enable debug logging, set the environment variable:
```bash
export DEBUG=gitlogmcp:*
```

## Development

### Building from Source
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Supported Models

GitLogMCP works with various OpenRouter models:

### Recommended Models
- `anthropic/claude-3-sonnet` - Best for detailed analysis
- `anthropic/claude-3-haiku` - Faster, cost-effective
- `openai/gpt-4-turbo` - High-quality analysis
- `openai/gpt-3.5-turbo` - Budget-friendly option

### Model Selection Tips
- Use Claude models for detailed code analysis
- Use GPT models for broader project insights
- Consider cost vs. quality based on your needs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the configuration examples
3. Create an issue on the repository

## Changelog

### Version 1.0.0
- Initial release
- Complete MCP server implementation
- OpenRouter integration
- Indonesian language analysis
- Comprehensive security features
- Markdown report generation

---

**Note:** This tool requires an active internet connection for AI analysis features. Git operations work offline.