# GitLogMCP - Git Repository Analysis with AI Integration

GitLogMCP is a Model Context Protocol (MCP) server that provides comprehensive git repository analysis capabilities with **enhanced AI-powered insights** using OpenRouter. This tool analyzes **actual code changes (diffs)** instead of just commit messages, providing meaningful insights about what your code actually does and its impact on your project.

## Features

### 🔍 Git Operations
- **Git Log**: Retrieve commit history with flexible filtering options
- **Git Diff**: Show differences between commits or specific files
- **Commit Information**: Get detailed commit data including author, message, and file changes
- **Repository Statistics**: Overview of repository metrics and authors
- **Author Listing**: Complete list of contributors with commit counts

### 🤖 AI-Powered Analysis
- **Real Code Analysis**: AI analyzes actual code changes (diffs) instead of just commit messages
- **Commit Analysis**: AI-powered analysis of individual commits with code impact assessment
- **Project Impact Summary**: Generate comprehensive project impact reports based on actual code changes
- **Intelligent Code Insights**: Understand what the code actually does and its impact on the project
- **Functionality Analysis**: Explains features, bug fixes, refactoring, and code improvements
- **Markdown Reports**: Automatically generated summary files with detailed code analysis

### 🔒 Security Features
- **Input Validation**: Comprehensive validation to prevent injection attacks
- **Path Traversal Protection**: Safe file and directory handling
- **Rate Limiting**: Built-in API rate limiting for OpenRouter calls
- **Secure Configuration**: Safe handling of API keys and sensitive data

## 🚀 Enhanced Analysis Capabilities

GitLogMCP goes beyond traditional git analysis by examining **actual code changes (diffs)** rather than just commit messages. This provides meaningful insights into what your code actually does and its impact on your project.

### Key Advantages:
- **Real Code Analysis**: Examines actual diffs, not just commit messages
- **Impact Assessment**: Explains how changes affect project architecture and functionality
- **Functionality Identification**: Detects features, bug fixes, refactoring, and optimizations
- **Meaningful Insights**: Based on code analysis rather than generic text summaries

### Example Output:
```
1. commit a1b2c3d4e5f6... (HEAD -> main, origin/main)
Author: John Doe <john@example.com>
Date: Sun, Oct 26, 2025, 10:27:14 AM GMT+7
Summary: Added authentication middleware with JWT token validation and error handling. This enhances security by requiring valid tokens for protected routes and provides standardized error responses for unauthorized access attempts.
File changes: src/middleware/auth.js, src/routes/api.js, src/utils/jwt.js
```

## Installation

### Prerequisites
- Node.js 18.0.0 or higher
- Git repository (the tool analyzes the current working directory)
- OpenRouter API key and model access

### Quick Installation (Recommended)

Install directly from npm:

```bash
npm install -g gitlogmcp
```

### Alternative: Development Installation

If you want to contribute or modify the code:

1. **Clone the repository:**
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

### Get OpenRouter API Key

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
      "command": "gitlogmcp",
      "args": [
        "--api-key", "your-openrouter-api-key",
        "--model-id", "anthropic/claude-3-sonnet",
        "--output-dir", "./summaries",
        "--max-commits", "100"
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
| `--language` | Analysis language (en\|id) | No | `id` |

> **Note:** The output directory specified by `--output-dir` will be automatically created if it doesn't exist, including any necessary parent directories. The system also verifies write permissions after creation.

### Example Configurations

#### Basic Configuration:
```json
{
  "mcpServers": {
    "gitlogmcp": {
      "command": "gitlogmcp",
      "args": [
        "--api-key", "sk-or-v1-your-api-key-here",
        "--model-id", "anthropic/claude-3-sonnet"
      ]
    }
  }
}
```

#### With Custom Options:
```json
{
  "mcpServers": {
    "gitlogmcp": {
      "command": "gitlogmcp",
      "args": [
        "--api-key", "sk-or-v1-your-api-key-here",
        "--model-id", "anthropic/claude-3-sonnet",
        "--repo-path", "C:\\your\\project\\path",
        "--output-dir", "C:\\summaries",
        "--max-commits", "50",
        "--language", "en"
      ]
    }
  }
}
```

#### Development Configuration (if installed from source):
```json
{
  "mcpServers": {
    "gitlogmcp": {
      "command": "node",
      "args": [
        "C:\\path\\to\\gitlogmcp\\build\\index.js",
        "--api-key", "sk-or-v1-your-api-key-here",
        "--model-id", "anthropic/claude-3-sonnet",
        "--language", "id"
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
AI-powered analysis of a commit with detailed insights in the configured language (English or Indonesian).

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
Generate AI-powered project impact summary with **real code analysis**. This tool analyzes actual code changes (diffs) instead of just commit messages to provide meaningful insights about what the code actually does and its impact on the project.

**Enhanced Features:**
- **Real Code Analysis**: Analyzes actual diff content, not just commit messages
- **Code Impact Assessment**: Explains what the code changes will accomplish
- **Functionality Analysis**: Identifies features, bug fixes, refactoring, and improvements
- **English Language Output**: Provides summaries in English for better accessibility

**Parameters:**
- `commitCount` (number, optional): Number of recent commits to analyze (1-50, default: 10)
- `outputFile` (string, optional): Custom filename for summary

**Output Format:**
Each commit includes:
- Full commit hash and metadata
- **Summary**: Real analysis of code changes and their impact (not just commit messages)
- **File changes**: List of modified, added, or deleted files

**Example:**
```
Generate project summary for the last 20 commits with real code analysis
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

2. **Enhanced Project Impact Analysis (Real Code Analysis):**
   ```
   Use generate_project_summary tool to analyze the last 15 commits with real code analysis
   ```
   
   **What this does:**
   - Analyzes actual code changes (diffs) for each commit
   - Explains what the code changes actually accomplish
   - Identifies features, bug fixes, refactoring, and improvements
   - Provides English language summaries based on code impact, not just commit messages

3. **Author Analysis:**
   ```
   Use list_authors tool to see all contributors
   ```

## Output Files

The tool generates markdown files in the specified output directory:

### Commit Analysis Files
- **Filename:** `commit-{hash}-{timestamp}.md`
- **Content:** Detailed analysis of individual commits
- **Includes:** Impact assessment, file changes, recommendations

### Project Summary Files
- **Filename:** `project-summary-{timestamp}.md`
- **Content:** Comprehensive project impact analysis with **real code analysis**
- **Enhanced Analysis:** Based on actual code changes (diffs), not just commit messages
- **Includes:** 
  - Real code impact assessment for each commit
  - What the code changes actually accomplish
  - Features, bug fixes, refactoring, and improvements identified
  - File changes and their project impact
  - English language summaries for better accessibility

## Security Features

GitLogMCP implements comprehensive security measures:
- **Input Validation**: Commit hashes and file paths are validated to prevent injection attacks
- **API Security**: Secure handling of OpenRouter API keys with built-in rate limiting
- **File System Protection**: Safe directory operations with path traversal prevention

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

```bash
npm run build    # Build the project
npm run dev      # Development mode
npm test         # Run tests
npm run lint     # Code linting
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

### Version 1.1.2 - Enhanced Documentation
- **🌐 Language Parameter Documentation**: Added missing `--language` parameter documentation with en|id options
- **📝 Tool Descriptions**: Fixed analyze_commit tool description to reflect configurable language support
- **⚙️ Configuration Examples**: Updated all examples to include language parameter
- **📁 Example Config**: Updated example-config.json to use npm package instead of local paths
- **🔧 Source Code**: Updated tool descriptions in source code for accuracy

### Version 1.1.1 - Documentation Improvements
- **📚 Updated Installation Instructions**: Prioritized npm installation method
- **⚙️ Simplified Configuration**: Updated mcpServers examples to use globally installed package
- **🔧 Development Setup**: Added separate development configuration section
- **📖 Improved Documentation**: Corrected all references to use npm package instead of local paths

### Version 1.1.0 - Enhanced Code Analysis
- **🚀 Real Code Analysis**: AI now analyzes actual code changes (diffs) instead of just commit messages
- **📊 Enhanced Project Summary**: `generate_project_summary` tool provides meaningful code impact analysis
- **🔍 Code Impact Assessment**: Explains what code changes actually accomplish in the project
- **🛠️ Functionality Analysis**: Identifies features, bug fixes, refactoring, and optimizations
- **🌐 English Language Output**: Project summaries now provided in English for better accessibility
- **⚡ Improved Performance**: Increased token limits to handle larger code analysis prompts
- **📝 Enhanced Output Format**: Structured format with real code analysis and file changes

### Version 1.0.0
- Initial release
- Complete MCP server implementation
- OpenRouter integration
- Comprehensive security features
- Markdown report generation

---

**Note:** This tool requires an active internet connection for AI analysis features. Git operations work offline.