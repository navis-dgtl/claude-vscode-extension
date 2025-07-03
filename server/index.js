#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

class VSCodeIntegrationServer {
  constructor() {
    this.server = new Server(
      {
        name: 'vscode-integration-dxt',
        version: '1.0.1',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Parse command line arguments
    const args = process.argv.slice(2);
    this.allowedDirectories = [];
    this.defaultWorkspace = path.join(os.homedir(), 'Code');
    this.debugMode = false;
    this.autoOpenVSCode = true;

    // Parse directories from arguments (before any flags)
    let i = 0;
    while (i < args.length && !args[i].startsWith('--')) {
      const dir = this.expandPath(args[i]);
      if (dir) {
        this.allowedDirectories.push(dir);
      }
      i++;
    }

    // Parse flags
    while (i < args.length) {
      const arg = args[i];
      if (arg === '--workspace' && i + 1 < args.length) {
        this.defaultWorkspace = this.expandPath(args[i + 1]);
        i += 2;
      } else if (arg === '--debug' && i + 1 < args.length) {
        this.debugMode = args[i + 1] === 'true';
        i += 2;
      } else if (arg === '--auto-open' && i + 1 < args.length) {
        this.autoOpenVSCode = args[i + 1] !== 'false';
        i += 2;
      } else {
        i++;
      }
    }

    // If no allowed directories were specified, use defaults
    if (this.allowedDirectories.length === 0) {
      this.allowedDirectories = [
        path.join(os.homedir(), 'Code'),
        path.join(os.homedir(), 'Documents'),
        path.join(os.homedir(), 'Desktop')
      ];
    }

    // Log configuration for debugging
    if (this.debugMode) {
      console.error('[VSCode Integration] Configuration:', {
        allowedDirectories: this.allowedDirectories,
        defaultWorkspace: this.defaultWorkspace,
        debugMode: this.debugMode,
        autoOpenVSCode: this.autoOpenVSCode,
        args: process.argv.slice(2)
      });
    }

    this.setupToolHandlers();
  }

  expandPath(filePath) {
    if (!filePath) return null;
    if (filePath.startsWith('~/')) {
      return path.join(os.homedir(), filePath.slice(2));
    }
    return path.resolve(filePath);
  }

  isPathAllowed(filePath) {
    const expandedPath = this.expandPath(filePath);
    const allowed = this.allowedDirectories.some(allowedDir => {
      const expandedAllowedDir = this.expandPath(allowedDir);
      return expandedPath.startsWith(expandedAllowedDir);
    });
    
    if (!allowed && this.debugMode) {
      console.error(`[VSCode Integration] Path not allowed: ${filePath}`);
      console.error(`[VSCode Integration] Expanded path: ${expandedPath}`);
      console.error(`[VSCode Integration] Allowed directories:`, this.allowedDirectories);
    }
    
    return allowed;
  }

  log(message) {
    if (this.debugMode) {
      console.error(`[VSCode Integration] ${message}`);
    }
  }

  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  getProjectTemplate(template, projectName) {
    const templates = {
      nodejs: {
        'package.json': JSON.stringify({
          name: projectName,
          version: '1.0.0',
          description: '',
          main: 'index.js',
          scripts: {
            start: 'node index.js',
            test: 'echo "Error: no test specified" && exit 1'
          },
          keywords: [],
          author: '',
          license: 'ISC'
        }, null, 2),
        'index.js': `console.log('Hello, ${projectName}!');

// Your code here
`,
        'README.md': `# ${projectName}

A Node.js project.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`
`,
        '.gitignore': `node_modules/
*.log
.env
dist/
build/
`
      },
      typescript: {
        'package.json': JSON.stringify({
          name: projectName,
          version: '1.0.0',
          description: '',
          main: 'dist/index.js',
          scripts: {
            build: 'tsc',
            start: 'node dist/index.js',
            dev: 'ts-node src/index.ts',
            test: 'echo "Error: no test specified" && exit 1'
          },
          devDependencies: {
            typescript: '^5.0.0',
            '@types/node': '^20.0.0',
            'ts-node': '^10.0.0'
          },
          keywords: [],
          author: '',
          license: 'ISC'
        }, null, 2),
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            outDir: './dist',
            rootDir: './src',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true
          },
          include: ['src/**/*'],
          exclude: ['node_modules', 'dist']
        }, null, 2),
        'src/index.ts': `console.log('Hello, ${projectName}!');

// Your TypeScript code here
`,
        'README.md': `# ${projectName}

A TypeScript project.

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
npm start
\`\`\`
`,
        '.gitignore': `node_modules/
*.log
.env
dist/
build/
`
      },
      react: {
        'package.json': JSON.stringify({
          name: projectName,
          version: '0.1.0',
          private: true,
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0',
            'react-scripts': '5.0.1'
          },
          scripts: {
            start: 'react-scripts start',
            build: 'react-scripts build',
            test: 'react-scripts test',
            eject: 'react-scripts eject'
          },
          eslintConfig: {
            extends: ['react-app', 'react-app/jest']
          },
          browserslist: {
            production: ['>0.2%', 'not dead', 'not op_mini all'],
            development: ['last 1 chrome version', 'last 1 firefox version', 'last 1 safari version']
          }
        }, null, 2),
        'public/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Web site created using Create React App" />
    <title>${projectName}</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
`,
        'src/index.js': `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
        'src/App.js': `import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>${projectName}</h1>
        <p>Edit <code>src/App.js</code> and save to reload.</p>
      </header>
    </div>
  );
}

export default App;
`,
        'src/App.css': `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
}
`,
        'src/index.css': `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
`,
        'README.md': `# ${projectName}

A React application.

## Available Scripts

### \`npm start\`
Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### \`npm run build\`
Builds the app for production to the \`build\` folder.

### \`npm test\`
Launches the test runner in interactive watch mode.
`,
        '.gitignore': `# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*
`
      },
      python: {
        'main.py': `#!/usr/bin/env python3
"""
${projectName}
"""

def main():
    print("Hello, ${projectName}!")

if __name__ == "__main__":
    main()
`,
        'requirements.txt': `# Add your dependencies here
`,
        'README.md': `# ${projectName}

A Python project.

## Installation

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Usage

\`\`\`bash
python main.py
\`\`\`
`,
        '.gitignore': `__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
.env
venv/
env/
`
      },
      html: {
        'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <h1>${projectName}</h1>
    </header>
    
    <main>
        <p>Welcome to your new HTML project!</p>
    </main>
    
    <script src="script.js"></script>
</body>
</html>
`,
        'style.css': `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f4f4f4;
}

header {
    background-color: #333;
    color: #fff;
    text-align: center;
    padding: 1rem;
}

main {
    max-width: 800px;
    margin: 2rem auto;
    padding: 1rem;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
`,
        'script.js': `document.addEventListener('DOMContentLoaded', function() {
    console.log('${projectName} loaded successfully!');
    
    // Your JavaScript code here
});
`,
        'README.md': `# ${projectName}

A simple HTML/CSS/JavaScript project.

## Usage

Open \`index.html\` in your web browser.
`
      },
      empty: {}
    };

    return templates[template] || templates.empty || {};
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_files',
          description: 'List files and directories in a specified path with detailed information',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Directory path to list'
              },
              showHidden: {
                type: 'boolean',
                description: 'Include hidden files and directories',
                default: false
              },
              recursive: {
                type: 'boolean',
                description: 'List files recursively',
                default: false
              }
            },
            required: ['path']
          }
        },
        {
          name: 'read_file',
          description: 'Read the contents of a file',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'File path to read'
              },
              encoding: {
                type: 'string',
                description: 'File encoding',
                default: 'utf8'
              }
            },
            required: ['path']
          }
        },
        {
          name: 'write_file',
          description: 'Write content to a file, creating directories if needed',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'File path to write to'
              },
              content: {
                type: 'string',
                description: 'Content to write to the file'
              },
              encoding: {
                type: 'string',
                description: 'File encoding',
                default: 'utf8'
              },
              createDirectories: {
                type: 'boolean',
                description: 'Create parent directories if they don\'t exist',
                default: true
              }
            },
            required: ['path', 'content']
          }
        },
        {
          name: 'delete_file',
          description: 'Delete a file or directory',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to delete'
              },
              recursive: {
                type: 'boolean',
                description: 'Delete directories recursively',
                default: false
              }
            },
            required: ['path']
          }
        },
        {
          name: 'create_directory',
          description: 'Create a directory and its parent directories',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Directory path to create'
              }
            },
            required: ['path']
          }
        },
        {
          name: 'search_files',
          description: 'Search for text patterns in files within a directory',
          inputSchema: {
            type: 'object',
            properties: {
              directory: {
                type: 'string',
                description: 'Directory to search in'
              },
              pattern: {
                type: 'string',
                description: 'Search pattern (regex supported)'
              },
              fileExtensions: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'File extensions to include (e.g., [\'.js\', \'.ts\'])'
              },
              recursive: {
                type: 'boolean',
                description: 'Search recursively',
                default: true
              },
              caseSensitive: {
                type: 'boolean',
                description: 'Case sensitive search',
                default: false
              }
            },
            required: ['directory', 'pattern']
          }
        },
        {
          name: 'open_vscode',
          description: 'Open VSCode with a file, directory, or workspace',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to open in VSCode'
              },
              newWindow: {
                type: 'boolean',
                description: 'Open in new window',
                default: false
              },
              wait: {
                type: 'boolean',
                description: 'Wait for the window to close',
                default: false
              }
            },
            required: ['path']
          }
        },
        {
          name: 'list_vscode_extensions',
          description: 'List installed VSCode extensions',
          inputSchema: {
            type: 'object',
            properties: {
              enabled: {
                type: 'boolean',
                description: 'Show only enabled extensions',
                default: false
              }
            }
          }
        },
        {
          name: 'install_vscode_extension',
          description: 'Install a VSCode extension',
          inputSchema: {
            type: 'object',
            properties: {
              extensionId: {
                type: 'string',
                description: 'Extension ID to install (e.g., \'ms-python.python\')'
              },
              force: {
                type: 'boolean',
                description: 'Force install even if already installed',
                default: false
              }
            },
            required: ['extensionId']
          }
        },
        {
          name: 'uninstall_vscode_extension',
          description: 'Uninstall a VSCode extension',
          inputSchema: {
            type: 'object',
            properties: {
              extensionId: {
                type: 'string',
                description: 'Extension ID to uninstall'
              }
            },
            required: ['extensionId']
          }
        },
        {
          name: 'create_project',
          description: 'Create a new project with a specified template',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Project name'
              },
              template: {
                type: 'string',
                description: 'Project template',
                enum: ['nodejs', 'typescript', 'react', 'vue', 'python', 'html', 'express', 'nextjs', 'empty'],
                default: 'empty'
              },
              directory: {
                type: 'string',
                description: 'Parent directory for the project'
              },
              openInVSCode: {
                type: 'boolean',
                description: 'Open project in VSCode after creation',
                default: true
              }
            },
            required: ['name']
          }
        },
        {
          name: 'run_terminal_command',
          description: 'Execute a terminal command in a specified directory',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'Command to execute'
              },
              directory: {
                type: 'string',
                description: 'Working directory for the command'
              },
              shell: {
                type: 'string',
                description: 'Shell to use',
                default: '/bin/zsh'
              }
            },
            required: ['command']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_files':
            return await this.handleListFiles(args);
          case 'read_file':
            return await this.handleReadFile(args);
          case 'write_file':
            return await this.handleWriteFile(args);
          case 'delete_file':
            return await this.handleDeleteFile(args);
          case 'create_directory':
            return await this.handleCreateDirectory(args);
          case 'search_files':
            return await this.handleSearchFiles(args);
          case 'open_vscode':
            return await this.handleOpenVSCode(args);
          case 'list_vscode_extensions':
            return await this.handleListVSCodeExtensions(args);
          case 'install_vscode_extension':
            return await this.handleInstallVSCodeExtension(args);
          case 'uninstall_vscode_extension':
            return await this.handleUninstallVSCodeExtension(args);
          case 'create_project':
            return await this.handleCreateProject(args);
          case 'run_terminal_command':
            return await this.handleRunTerminalCommand(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async handleListFiles(args) {
    const { path: dirPath, showHidden = false, recursive = false } = args;
    const expandedPath = this.expandPath(dirPath);

    if (!this.isPathAllowed(expandedPath)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Access denied to path: ${dirPath}. Allowed directories: ${this.allowedDirectories.join(', ')}`
      );
    }

    this.log(`Listing files in: ${expandedPath}`);

    try {
      const stats = await fs.stat(expandedPath);
      if (!stats.isDirectory()) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Path is not a directory: ${dirPath}`
        );
      }

      const listFiles = async (currentPath, depth = 0) => {
        const items = await fs.readdir(currentPath, { withFileTypes: true });
        const results = [];

        for (const item of items) {
          if (!showHidden && item.name.startsWith('.')) {
            continue;
          }

          const itemPath = path.join(currentPath, item.name);
          const relativePath = path.relative(expandedPath, itemPath);
          const stat = await fs.stat(itemPath);

          const fileInfo = {
            name: item.name,
            path: relativePath || '.',
            type: item.isDirectory() ? 'directory' : 'file',
            size: stat.size,
            modified: stat.mtime.toISOString(),
            permissions: stat.mode.toString(8).slice(-3)
          };

          results.push(fileInfo);

          if (recursive && item.isDirectory() && depth < 10) {
            const subItems = await listFiles(itemPath, depth + 1);
            results.push(...subItems);
          }
        }

        return results;
      };

      const files = await listFiles(expandedPath);
      
      return {
        content: [
          {
            type: 'text',
            text: `Files in ${dirPath}:\n\n${files.map(f => 
              `${f.type === 'directory' ? '📁' : '📄'} ${f.path} (${f.size} bytes, ${f.modified})`
            ).join('\n')}`
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list files: ${error.message}`
      );
    }
  }

  async handleReadFile(args) {
    const { path: filePath, encoding = 'utf8' } = args;
    const expandedPath = this.expandPath(filePath);

    if (!this.isPathAllowed(expandedPath)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Access denied to path: ${filePath}. Allowed directories: ${this.allowedDirectories.join(', ')}`
      );
    }

    this.log(`Reading file: ${expandedPath}`);

    try {
      const content = await fs.readFile(expandedPath, encoding);
      return {
        content: [
          {
            type: 'text',
            text: `File: ${filePath}\n\n${content}`
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read file: ${error.message}`
      );
    }
  }

  async handleWriteFile(args) {
    const { path: filePath, content, encoding = 'utf8', createDirectories = true } = args;
    const expandedPath = this.expandPath(filePath);

    if (!this.isPathAllowed(expandedPath)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Access denied to path: ${filePath}. Allowed directories: ${this.allowedDirectories.join(', ')}`
      );
    }

    this.log(`Writing file: ${expandedPath}`);

    try {
      if (createDirectories) {
        const dir = path.dirname(expandedPath);
        await this.ensureDirectoryExists(dir);
      }

      await fs.writeFile(expandedPath, content, encoding);
      return {
        content: [
          {
            type: 'text',
            text: `Successfully wrote ${content.length} characters to ${filePath}`
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to write file: ${error.message}`
      );
    }
  }

  async handleDeleteFile(args) {
    const { path: filePath, recursive = false } = args;
    const expandedPath = this.expandPath(filePath);

    if (!this.isPathAllowed(expandedPath)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Access denied to path: ${filePath}. Allowed directories: ${this.allowedDirectories.join(', ')}`
      );
    }

    this.log(`Deleting: ${expandedPath}`);

    try {
      const stats = await fs.stat(expandedPath);
      if (stats.isDirectory()) {
        await fs.rmdir(expandedPath, { recursive });
      } else {
        await fs.unlink(expandedPath);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Successfully deleted ${filePath}`
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to delete: ${error.message}`
      );
    }
  }

  async handleCreateDirectory(args) {
    const { path: dirPath } = args;
    const expandedPath = this.expandPath(dirPath);

    if (!this.isPathAllowed(expandedPath)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Access denied to path: ${dirPath}. Allowed directories: ${this.allowedDirectories.join(', ')}`
      );
    }

    this.log(`Creating directory: ${expandedPath}`);

    try {
      await this.ensureDirectoryExists(expandedPath);
      return {
        content: [
          {
            type: 'text',
            text: `Successfully created directory ${dirPath}`
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create directory: ${error.message}`
      );
    }
  }

  async handleSearchFiles(args) {
    const { 
      directory, 
      pattern, 
      fileExtensions = [], 
      recursive = true, 
      caseSensitive = false 
    } = args;
    
    const expandedPath = this.expandPath(directory);

    if (!this.isPathAllowed(expandedPath)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Access denied to path: ${directory}. Allowed directories: ${this.allowedDirectories.join(', ')}`
      );
    }

    this.log(`Searching in: ${expandedPath} for pattern: ${pattern}`);

    try {
      const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
      const results = [];

      const searchInFile = async (filePath) => {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            if (regex.test(line)) {
              results.push({
                file: path.relative(expandedPath, filePath),
                line: index + 1,
                content: line.trim(),
                match: line.match(regex)?.[0]
              });
            }
          });
        } catch (error) {
          // Skip files that can't be read as text
        }
      };

      const searchDirectory = async (currentPath) => {
        const items = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const item of items) {
          if (item.name.startsWith('.')) continue;
          
          const itemPath = path.join(currentPath, item.name);
          
          if (item.isDirectory() && recursive) {
            await searchDirectory(itemPath);
          } else if (item.isFile()) {
            if (fileExtensions.length === 0 || 
                fileExtensions.some(ext => item.name.endsWith(ext))) {
              await searchInFile(itemPath);
            }
          }
        }
      };

      await searchDirectory(expandedPath);

      return {
        content: [
          {
            type: 'text',
            text: `Search results for "${pattern}" in ${directory}:\n\n${
              results.length === 0 
                ? 'No matches found.'
                : results.map(r => `${r.file}:${r.line} - ${r.content}`).join('\n')
            }`
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Search failed: ${error.message}`
      );
    }
  }

  async handleOpenVSCode(args) {
    const { path: targetPath, newWindow = false, wait = false } = args;
    const expandedPath = this.expandPath(targetPath);

    if (!this.isPathAllowed(expandedPath)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Access denied to path: ${targetPath}. Allowed directories: ${this.allowedDirectories.join(', ')}`
      );
    }

    this.log(`Opening VSCode: ${expandedPath}`);

    try {
      let command = `code "${expandedPath}"`;
      if (newWindow) command += ' --new-window';
      if (wait) command += ' --wait';

      const { stdout, stderr } = await execAsync(command);
      
      return {
        content: [
          {
            type: 'text',
            text: `VSCode opened with ${targetPath}${stderr ? `\nWarning: ${stderr}` : ''}`
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to open VSCode: ${error.message}`
      );
    }
  }

  async handleListVSCodeExtensions(args) {
    const { enabled = false } = args;

    this.log(`Listing VSCode extensions (enabled only: ${enabled})`);

    try {
      let command = 'code --list-extensions --show-versions';
      if (enabled) command += ' --enabled-only';

      const { stdout } = await execAsync(command);
      const extensions = stdout.trim().split('\n').filter(Boolean);

      return {
        content: [
          {
            type: 'text',
            text: `Installed VSCode Extensions:\n\n${extensions.join('\n')}`
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list extensions: ${error.message}`
      );
    }
  }

  async handleInstallVSCodeExtension(args) {
    const { extensionId, force = false } = args;

    this.log(`Installing VSCode extension: ${extensionId}`);

    try {
      let command = `code --install-extension ${extensionId}`;
      if (force) command += ' --force';

      const { stdout, stderr } = await execAsync(command);
      
      return {
        content: [
          {
            type: 'text',
            text: `Extension ${extensionId} installation result:\n${stdout}${stderr ? `\nWarnings: ${stderr}` : ''}`
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to install extension: ${error.message}`
      );
    }
  }

  async handleUninstallVSCodeExtension(args) {
    const { extensionId } = args;

    this.log(`Uninstalling VSCode extension: ${extensionId}`);

    try {
      const { stdout, stderr } = await execAsync(`code --uninstall-extension ${extensionId}`);
      
      return {
        content: [
          {
            type: 'text',
            text: `Extension ${extensionId} uninstallation result:\n${stdout}${stderr ? `\nWarnings: ${stderr}` : ''}`
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to uninstall extension: ${error.message}`
      );
    }
  }

  async handleCreateProject(args) {
    const { name, template = 'empty', directory, openInVSCode = true } = args;
    
    const projectDir = directory 
      ? this.expandPath(path.join(directory, name))
      : this.expandPath(path.join(this.defaultWorkspace, name));

    if (!this.isPathAllowed(projectDir)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Access denied to path: ${projectDir}. Allowed directories: ${this.allowedDirectories.join(', ')}`
      );
    }

    this.log(`Creating project: ${name} with template: ${template}`);

    try {
      // Create project directory
      await this.ensureDirectoryExists(projectDir);

      // Get template files
      const templateFiles = this.getProjectTemplate(template, name);

      // Create files from template
      for (const [filePath, content] of Object.entries(templateFiles)) {
        const fullPath = path.join(projectDir, filePath);
        await this.ensureDirectoryExists(path.dirname(fullPath));
        await fs.writeFile(fullPath, content, 'utf8');
      }

      let result = `Successfully created project "${name}" with template "${template}" at ${projectDir}`;

      // Open in VSCode if requested
      if (openInVSCode && this.autoOpenVSCode) {
        try {
          await execAsync(`code "${projectDir}"`);
          result += '\nProject opened in VSCode';
        } catch (error) {
          result += '\nNote: Could not open VSCode automatically';
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: result
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create project: ${error.message}`
      );
    }
  }

  async handleRunTerminalCommand(args) {
    const { command, directory, shell = '/bin/zsh' } = args;
    
    const workingDir = directory ? this.expandPath(directory) : process.cwd();

    if (directory && !this.isPathAllowed(workingDir)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Access denied to path: ${directory}. Allowed directories: ${this.allowedDirectories.join(', ')}`
      );
    }

    this.log(`Running command: ${command} in ${workingDir}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDir,
        shell,
        timeout: 30000 // 30 second timeout
      });

      return {
        content: [
          {
            type: 'text',
            text: `Command: ${command}\nWorking Directory: ${workingDir}\n\nOutput:\n${stdout}${stderr ? `\nErrors:\n${stderr}` : ''}`
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Command execution failed: ${error.message}`
      );
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('VSCode Integration DXT Server running on stdio');
  }
}

// Start the server
const server = new VSCodeIntegrationServer();
server.run().catch(console.error);