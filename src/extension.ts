import * as vscode from 'vscode';
import axios from 'axios';

const messages: any[] = [];

async function sendCodeAndDisplayResult(action: string, code?: string) {
  let response;

  const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
  const fileName = filePath ? filePath.split('/').pop() : '';

  if (code) {
    response = await axios.post('http://localhost:3000/send-message', {
      message: `
        As an engineer,
        code in "${fileName}",
        please "${action}" for this code: \n
        ${code}
      `,
    });
  } else {
    response = await axios.post('http://localhost:3000/send-message', {
      message: action,
    });
  }

  messages.push({ type: 'sent', action: action, code: code || '', fileName: fileName });
  messages.push({ type: 'received', content: response.data.data });

  const resultPanel = vscode.window.createWebviewPanel(
    'web-chatgpt-panel',
    'Web ChatGPT',
    vscode.ViewColumn.Two,
    {
      enableScripts: true,
    }
  );

  resultPanel.webview.html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: sans-serif;
    }
    .sent {
      background-color: #404040;
      color: #0000b3;
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 5px;
    }
    .received {
      background-color: #404040;
      padding: 10px;
      border-radius: 5px;
      color: #8080ff;
    }
    .code {
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      background-color: black;
      color: #cccccc;
    }
  </style>
  <script>
    function toggleCode(element) {
      if (element.style.whiteSpace === 'nowrap') {
        element.style.whiteSpace = 'normal';
      } else {
        element.style.whiteSpace = 'nowrap';
      }
    }
  </script>
</head>
<body>
  <h1>Result</h1>
  ${generateMessagesHTML()}
</body>
</html>`;
}

function generateMessagesHTML() {
  return messages
    .map((message) => {
      if (message.type === 'sent') {
        return `
<div class="${message.type}">
  <strong>Me:</strong>
  <p>Action: ${message.action}</p>
  ${message.fileName ? `<p>File: ${message.fileName}</p>` : ''}
  <div class="code" onclick="toggleCode(this)">${message.code}</div>
</div>`;
      } else {
        return `
<div class="${message.type}">
  <strong>ChatGPT:</strong>
  <pre>${message.content}</pre>
</div>`;
      }
    })
    .join('');
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-web-chatgpt.explainCode', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selectedText = editor.document.getText(editor.selection);
        sendCodeAndDisplayResult('explain this code', selectedText);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-web-chatgpt.refactorCode', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selectedText = editor.document.getText(editor.selection);
        sendCodeAndDisplayResult('refactor this code', selectedText);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-web-chatgpt.documentationCode', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selectedText = editor.document.getText(editor.selection);
        sendCodeAndDisplayResult('document this code', selectedText);
      }
    })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('vscode-web-chatgpt.findBugs', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const selectedText = editor.document.getText(editor.selection);
          sendCodeAndDisplayResult('find bugs in this code', selectedText);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('vscode-web-chatgpt.rememberCode', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const selectedText = editor.document.getText(editor.selection);
          sendCodeAndDisplayResult('remember this code', selectedText);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('vscode-web-chatgpt.askQuestion', () => {
        vscode.window.showInputBox({ prompt: 'Ask a question to ChatGPT' }).then((question) => {
          if (question) {
            sendCodeAndDisplayResult(question);
          }
        });
      })
    );
  }

  export function deactivate() {}
