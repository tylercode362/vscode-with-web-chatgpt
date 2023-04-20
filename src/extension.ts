import * as vscode from 'vscode';
import axios from 'axios';

async function sendCodeAndDisplayResult(action: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const code = editor.document.getText(editor.selection);

  const response = await axios.post('http://localhost:3000/send-message', {
    message: `
      as engineer,
      please "${action}" this code: \n
      ${code}
    `
  });

  const panel = vscode.window.createWebviewPanel(
    'web-chatgpt-panel',
    'Web ChatGPT',
    vscode.ViewColumn.Two,
    {}
  );

  panel.webview.html = `<html><body><h1>Result</h1><pre>${response.data.explanation}</pre></body></html>`;
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-web-chatgpt.explainCode', async () => {
      await sendCodeAndDisplayResult('explain');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-web-chatgpt.refactorCode', async () => {
      await sendCodeAndDisplayResult('refactor');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-web-chatgpt.documentationCode', async () => {
      await sendCodeAndDisplayResult('documentation');
    })
  );
}

export function deactivate() {}
