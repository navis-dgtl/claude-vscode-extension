# VSCode Integration DXT

A comprehensive Visual Studio Code integration extension for Claude Desktop that provides file management, project creation, and development tools through the Model Context Protocol (MCP).

## Features

### 🗂️ File Management
- **List Files**: Browse directories with detailed file information
- **Read/Write Files**: Create, edit, and manage file contents
- **Delete Files**: Remove files and directories (with safety checks)
- **Create Directories**: Set up project structures
- **Search Files**: Find text patterns across your codebase with regex support

### 🚀 Project Creation
- **Multiple Templates**: Support for Node.js, TypeScript, React, Python, HTML, and more
- **Auto-setup**: Automatically creates project structure with appropriate files
- **VSCode Integration**: Optionally opens new projects in VSCode

### 🔧 VSCode Integration
- **Open Files/Projects**: Launch VSCode with specific files or directories
- **Extension Management**: Install, uninstall, and list VSCode extensions
- **Terminal Commands**: Execute commands in project directories

### 🔍 Development Tools
- **File Search**: Regex-powered search across files and directories
- **Project Templates**: Pre-configured templates for common project types
- **Smart Permissions**: Configurable directory access controls

## Installation

### Prerequisites

- Node.js 16.0.0 or higher
- Visual Studio Code with CLI enabled
- Claude Desktop >= 0.10.0
- DXT CLI: `npm install -g @anthropic-ai/dxt`

### Option 1: Pre-packed Extension (Recommended)

1. **Download the `.dxt` file** from your company's cloud storage
2. **Install in Claude Desktop:**
   - Double-click the `.dxt` file, or
   - Open Claude Desktop and use the extension installation feature
3. **Configure settings** when prompted

### Option 2: From Source

1. **Download the source folder** from cloud storage
2. **Install dependencies:**
   ```bash
   cd vscode-extension
   npm install
   ```
3. **Create the extension package:**
   ```bash
   npm run pack
   # or
   npx @anthropic-ai/dxt pack .
   ```
4. **Install the generated `.dxt` file** in Claude Desktop

## Configuration

When installing the extension, you'll be prompted to configure:

### Security Settings
- **Allowed Directories**: Specify which directories the extension can access
  - Default: `~/Code`, `~/Documents`, `~/Desktop`
  - Add any additional directories you want to work with
- **Default Workspace**: Set the default location for new projects
  - Default: `~/Code`

### Feature Settings
- **Debug Mode**: Enable detailed logging for troubleshooting
  - Default: `false`
- **Auto-open VSCode**: Automatically open VSCode for created projects
  - Default: `true`

## Available Tools

### File Operations
- `list_files` - List directory contents with metadata
- `read_file` - Read file contents
- `write_file` - Create or update files
- `delete_file` - Remove files or directories
- `create_directory` - Create directory structures

### Search & Discovery
- `search_files` - Search for text patterns in files
- `open_vscode` - Open files/directories in VSCode

### Project Management
- `create_project` - Generate new projects from templates
- `run_terminal_command` - Execute commands in project directories

### VSCode Integration
- `list_vscode_extensions` - View installed extensions
- `install_vscode_extension` - Install new extensions
- `uninstall_vscode_extension` - Remove extensions

## Project Templates

The extension includes templates for:

- **Node.js**: Basic Node.js project with package.json
- **TypeScript**: TypeScript project with compilation setup
- **React**: React application with Create React App structure
- **Python**: Python project with requirements.txt
- **HTML**: Static HTML/CSS/JavaScript website
- **Empty**: Basic directory structure

## Usage Examples

### Create a New Project
```
Claude, create a new React project called "my-app" in ~/Code
```

### File Management
```
Claude, list all files in ~/Code/my-project
Claude, read the contents of ~/Code/my-project/package.json
Claude, create a new file at ~/Code/my-project/src/utils.js with utility functions
```

### Search and Discovery
```
Claude, search for "console.log" in all JavaScript files in ~/Code/my-project
Claude, find all TODO comments in ~/Code
```

### VSCode Integration
```
Claude, open ~/Code/my-project in VSCode
Claude, install the Prettier extension for VSCode
Claude, show me all installed VSCode extensions
```

### Terminal Commands
```
Claude, run "npm install" in ~/Code/my-project
Claude, execute "git status" in my project directory
```

## Development

### Project Structure
```
vscode-extension/
├── server/
│   └── index.js        # Main MCP server implementation
├── manifest.json       # Extension manifest
├── package.json        # Node.js dependencies
├── package-lock.json   # Locked dependency versions
├── README.md          # This file
└── icon.png           # Extension icon
```

### Building
```bash
npm run validate  # Validate manifest
npm run pack      # Create extension package
npm start         # Run server directly (for testing)
npm run dev       # Run with debug logging enabled
```

### Helpful Scripts
```bash
npm run clean       # Remove node_modules and package-lock.json
npm run reinstall   # Clean and reinstall dependencies
npm run prepare-upload  # Remove node_modules and .dxt files before uploading
```

### Testing
```bash
# Test basic functionality
node server/index.js

# Test with debug output
npm run dev

# Validate extension manifest
dxt validate manifest.json
```

## Security

- **Directory Restrictions**: Access is limited to configured allowed directories
- **Path Validation**: All paths are validated before execution
- **Command Timeouts**: Terminal commands have 30-second timeout
- **Safe Defaults**: Conservative defaults for file operations
- **No Sensitive Data Storage**: API keys and sensitive data should be handled securely

## Troubleshooting

### Common Issues

**Extension won't install:**
- Ensure DXT CLI is installed: `npm install -g @anthropic-ai/dxt`
- Check Node.js version: `node --version` (should be ≥16.0.0)
- Validate manifest: `npm run validate`

**"Access denied to path" errors:**
- Check that the path is within your configured allowed directories
- The error message will show which directories are allowed
- Add more directories in Claude Desktop's extension settings if needed

**VSCode commands fail:**
- Ensure VSCode CLI is enabled: `code --version`
- On macOS: Install 'code' command from VSCode (Command Palette → Shell Command: Install 'code' command in PATH)
- On Windows: VSCode installer usually adds it automatically
- On Linux: Follow VSCode documentation for your distribution

**Permission errors:**
- Check allowed directories in extension configuration
- Ensure target directories exist and are accessible
- Enable debug mode for detailed logging

**File operations fail:**
- Verify paths are within allowed directories
- Check file permissions
- Ensure sufficient disk space
- Enable debug mode to see exact error messages

**Dependencies missing (source version):**
- Run `npm install` in the extension directory
- If issues persist: `npm run reinstall`

### Debug Mode

Enable debug mode in the extension configuration to see detailed logs:
- During installation: Set "Debug Mode" to `true`
- Logs will appear in Claude Desktop's developer console
- Shows allowed directories, path expansions, and operation details

### Checking Logs

When debug mode is enabled, check for lines starting with `[VSCode Integration]` in:
- Claude Desktop's developer console
- Terminal output if running standalone

## Version History

- **1.0.1**: Fixed directory access issues, improved argument parsing
- **1.0.0**: Initial release with full feature set

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly with `npm run dev`
5. Validate with `npm run validate`
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Email: nick.prince@Life.church
- LinkedIn: https://www.linkedin.com/in/nickcprince/
- Check the troubleshooting section above
- Review the Claude Desktop documentation
- Enable debug mode for detailed error information

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Inspired by the MCP filesystem server
- Thanks to the Claude Desktop team for the DXT extension framework

---

**Transform your development workflow with seamless VSCode integration in Claude Desktop! 🚀**