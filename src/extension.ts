import * as vscode from 'vscode';
import axios from 'axios';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

class WebChatGPTViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private messageCache: any[] = [];

  constructor(private readonly _extensionUri: vscode.Uri, private readonly _globalState: vscode.Memento) {
    this.messageCache = this._globalState.get("messageCache") || [];
  }

  public clearMessageCache() {
    this.messageCache = [];
    this._globalState.update("messageCache", this.messageCache);

    if (this._view) {
      this._view.webview.postMessage({ type: 'clearMessages' });
    }
  }

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
        enableScripts: true,
    };

    if (!webviewView.webview.html) {
      webviewView.webview.html = this.generateWebviewContent();
    }

    webviewView.onDidChangeVisibility(() => {
        if (webviewView.visible) {
          this.loadCachedMessages();
        }
    });

    this.loadCachedMessages();
  }

  private sanitizeHTML(unsafeHTML: string): string {
    const allowedTags = ['div', 'code', 'p', 'br', 'ul', 'li', 'pre'];
    const allowedAttributes = ['class'];

    return DOMPurify.sanitize(unsafeHTML, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: allowedAttributes,
    });
  }

  private generateWebviewContent() {
    return `
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
          background-color: #262626;
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
        .timestamp {
          font-size: 0.8em;
          color: #999;
        }
      </style>
      <script>
        const vscode = acquireVsCodeApi();

        window.addEventListener('message', event => {
          const message = event.data;
          if (message.type === 'clearMessages') {
            clearMessages();
          } else if (message.type === 'showThinking') {
            showThinking();
          } else if (message.type === 'hideThinking') {
            hideThinking();
          } else {
            const messageDiv = document.createElement('div');
            messageDiv.className = message.type;
            messageDiv.innerHTML = message.type === 'sent'
            ? \`<strong>Me:</strong> <span class="timestamp">(\${message.timestamp})</span><br><p>Action: \${message.action}</p>\${message.fileName ? \`<p>File: \${message.fileName}</p>\` : ''}\${message.code ? \`<div class="code" onclick="toggleExpand(this)">\${message.code}</div>\` : ''}\`
            : \`<strong>ChatGPT:</strong> <span class="timestamp">(\${message.timestamp})</span><br><p>\${message.content}</p>\`;            document.getElementById('messages').appendChild(messageDiv);

            window.scrollTo(0, document.body.scrollHeight);
          }
        });

        function clearMessages() {
          document.getElementById('messages').innerHTML = '';
        }

        function showThinking() {
          const thinkingDiv = document.getElementById('thinking');
          thinkingDiv.innerHTML = '<strong>ChatGPT is thinking...</strong>';
        }

        function hideThinking() {
          const thinkingDiv = document.getElementById('thinking');
          thinkingDiv.innerHTML = '';
        }

        function toggleExpand(element) {
          element.style.whiteSpace = element.style.whiteSpace === 'nowrap' ? 'pre-wrap' : 'nowrap';
        }
      </script>
    </head>
    <body>
      <div id="messages"></div>
      <div id="thinking" class="thinking"></div>
    </body>
    </html>
    `;
  }

  private loadCachedMessages() {
    if (this._view && this.messageCache.length > 0) {
      for (const message of this.messageCache) {
        this._view.webview.postMessage(message);
      }
    }
  }

  public openPanel() {
    if (this._view) {
      this._view.show(true);
    }
  }

  async sendCodeAndDisplayResult(action: string, code?: string) {
    let response;

    const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
    const fileName = filePath ? filePath.split('/').pop() : '';
    let message = "";

    if (code) {
      message = `
      As an engineer,
      code in "${fileName}",
      please "${action}" for this code: \n
      ${code}
      `
    }else{
      message = action;
    }

    const sentTimestamp = new Date().toLocaleTimeString();

    const sentMessage = { type: 'sent', action: action, code: code || '', fileName: fileName, timestamp: sentTimestamp };
    this.messageCache.push(sentMessage);
    this._globalState.update("messageCache", this.messageCache);

    if (this._view) {
      this._view.webview.postMessage(sentMessage);
      this._view.webview.postMessage({ type: 'showThinking' });
    }

    response = await axios.post('http://localhost:3000/send-message', {
      message: message
    });

    const responseTimestamp = new Date().toLocaleTimeString();

    if (response.data && response.data.data) {
      const receivedMessage = {
        type: 'received',
        content: this.sanitizeHTML(response.data.data),
        timestamp: responseTimestamp,
      };

      this.messageCache.push(receivedMessage);
      this._globalState.update("messageCache", this.messageCache);

      if (this._view) {
        this._view.webview.postMessage(receivedMessage);
        this._view.webview.postMessage({ type: 'hideThinking' });
      }
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  const viewProvider = new WebChatGPTViewProvider(context.extensionUri, context.globalState);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("web-chatgpt-panel", viewProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-web-chatgpt.explainCode', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        viewProvider.openPanel();
        const selectedText = editor.document.getText(editor.selection);
        viewProvider.sendCodeAndDisplayResult('explain this code', selectedText);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-web-chatgpt.refactorCode', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        viewProvider.openPanel();
        const selectedText = editor.document.getText(editor.selection);
        viewProvider.sendCodeAndDisplayResult('refactor this code', selectedText);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-web-chatgpt.documentationCode', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        viewProvider.openPanel();
        const selectedText = editor.document.getText(editor.selection);
        viewProvider.sendCodeAndDisplayResult('document this code', selectedText);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-web-chatgpt.findBugs', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        viewProvider.openPanel();
        const selectedText = editor.document.getText(editor.selection);
        viewProvider.sendCodeAndDisplayResult('find bugs include any security vulnerabilities, injection attacks, and other issues in this code', selectedText);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-web-chatgpt.rememberCode', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        viewProvider.openPanel();
        const selectedText = editor.document.getText(editor.selection);
        viewProvider.sendCodeAndDisplayResult('remember this code', selectedText);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-web-chatgpt.askQuestion', () => {
      vscode.window.showInputBox({ prompt: 'Ask a question to ChatGPT' }).then((question) => {
        if (question) {
          viewProvider.openPanel();
          viewProvider.sendCodeAndDisplayResult(question);
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-web-chatgpt.clearMessageCache', () => {
      viewProvider.clearMessageCache();
    })
  );
}

export function deactivate() { }

