# VSCode Web ChatGPT Extension

The VSCode Web ChatGPT Extension is a useful tool for code explanation, refactoring, and documentation generation. By integrating with a ChatGPT web, it allows users to easily obtain explanations for selected code snippets, suggested refactoring, and relevant documentation.

![image](https://user-images.githubusercontent.com/22150402/235414828-135282d1-1f5a-475d-8a47-cba0d66995b4.png)

![image](https://user-images.githubusercontent.com/22150402/235414899-93ce3066-b6be-480e-857e-ed7cb0b71949.png)

![image](https://user-images.githubusercontent.com/22150402/235414852-3c5f8d29-a69f-4871-908d-4eedc35cec73.png)


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

Install API Bridge Chrome Extension for ChatGPT(Web)

https://github.com/tylercode362/Chrome-extension-ChatGPT-API

An innovative browser extension designed to enable smooth communication with chat.openai.com through WebSockets. This extension allows users to engage with the chat interface by sending messages and receiving replies via a WebSocket server, offering a streamlined and user-friendly experience.

This WebSocket API Bridge Extension is compatible with both ChatGPT Plus (including GPT-3.5 and GPT-4) and the Free Version, ensuring accessibility for a diverse user base.

## Usage

1. Select a piece of code in the editor.
2. Right-click the selected code to access the context menu.
3. Click on the desired action: "ChatGPT explain", "ChatGPT refactor", or "ChatGPT documentation".
4. The result will be displayed in a dedicated panel within the editor.

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the extension.

## License

[MIT License](LICENSE)
