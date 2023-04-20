# VSCode Web ChatGPT Extension

The VSCode Web ChatGPT Extension is a useful tool for code explanation, refactoring, and documentation generation. By integrating with a locally running ChatGPT service, it allows users to easily obtain explanations for selected code snippets, suggested refactoring, and relevant documentation.

## Features

- Right-click context menu integration for quick access to actions like "Explain", "Refactor", and "Generate Documentation".
- Displays the output of the selected action in a dedicated panel within the editor.
- Communicates with a local server running on `http://localhost:3000/send-message`.

## Installation

1. Clone the repository and navigate to the project directory.
2. Run `yarn install` to install dependencies.
3. Run `yarn compile` to build the extension.
4. Package the extension by running `vsce package`. This will generate a `.vsix` file.
5. Install the extension in your VSCode editor by selecting `Extensions` > `...` (top right) > `Install from VSIX...` and then choosing the generated `.vsix` file.

## Requirements

- A local ChatGPT service running on `http://localhost:3000/send-message`.

## Usage

1. Select a piece of code in the editor.
2. Right-click the selected code to access the context menu.
3. Click on the desired action: "ChatGPT explain", "ChatGPT refactor", or "ChatGPT documentation".
4. The result will be displayed in a dedicated panel within the editor.

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the extension.

## License

[MIT License](LICENSE)
