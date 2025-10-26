#!/usr/bin/env node

/**
 * Test script to validate GitLogMCP installation
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing GitLogMCP Installation...\n');

// Test 1: Help command
console.log('1. Testing help command...');
const helpProcess = spawn('node', ['build/index.js', '--help'], {
  cwd: __dirname,
  stdio: 'pipe'
});

let helpOutput = '';
helpProcess.stdout.on('data', (data) => {
  helpOutput += data.toString();
});

helpProcess.on('close', (code) => {
  if (code === 0 && helpOutput.includes('GitLogMCP')) {
    console.log('   ✅ Help command works correctly\n');
    
    // Test 2: Basic server startup
    console.log('2. Testing basic server startup...');
    const serverProcess = spawn('node', ['build/index.js', '--repo-path', '.'], {
      cwd: __dirname,
      stdio: 'pipe'
    });

    let serverOutput = '';
    serverProcess.stdout.on('data', (data) => {
      serverOutput += data.toString();
    });

    // Kill server after 2 seconds
    setTimeout(() => {
      serverProcess.kill();
    }, 2000);

    serverProcess.on('close', (code) => {
      if (serverOutput.includes('GitLogMCP server running')) {
        console.log('   ✅ Server starts successfully\n');
        
        console.log('🎉 Installation test completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Configure your MCP client with the example-config.json');
        console.log('2. Add your OpenRouter API key and model ID for AI features');
        console.log('3. Point the repo-path to your target Git repository');
        console.log('\n📖 See README.md for detailed usage instructions.');
      } else {
        console.log('   ❌ Server startup failed');
        console.log('   Output:', serverOutput);
      }
    });

    serverProcess.on('error', (error) => {
      console.log('   ❌ Server startup error:', error.message);
    });

  } else {
    console.log('   ❌ Help command failed');
    console.log('   Exit code:', code);
    console.log('   Output:', helpOutput);
  }
});

helpProcess.on('error', (error) => {
  console.log('   ❌ Help command error:', error.message);
});