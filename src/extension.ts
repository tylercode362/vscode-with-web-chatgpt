import * as vscode from 'vscode';
import axios from 'axios';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

class WebChatGPTViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private messageCache: any[] = [];
  private pendingQueues: any[] = [];
  private isSending: boolean = false;

  constructor(private readonly _extensionUri: vscode.Uri, private readonly _globalState: vscode.Memento) {
    this.messageCache = this._globalState.get("messageCache") || [];
  }

  public handleWebviewMessage(message: any) {
    if (message.type === 'inputBoxMessage') {
      this.openPanel();

      let selectedText = '';
      const editor = vscode.window.activeTextEditor;

      if (editor) {
        selectedText = editor.document.getText(editor.selection);
      }

      this.sendCodeAndDisplayResult(message.content, selectedText, true);
    }else if(message.type === 'retryLast') {
      const lastMessage = this.messageCache.slice(-1)[0];
      this.sendRequest(lastMessage, false);
    }
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

    webviewView.webview.onDidReceiveMessage((message) => {
      this.handleWebviewMessage(message);
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
        .sent {
          background-color: #262626;
          color: #bbbbbb;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 5px;
        }
        .received {
          background-color: #404040;
          padding: 10px;
          border-radius: 5px;
          color: #bbbbbb;
        }

        .code {
          position: relative;
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          background-color: black;
          color: #cccccc;
          padding: 5px;
          height: 40px;
        }

        .code.expanded {
          white-space: pre-wrap;
          height: auto;
        }

        .expand-collapse {
          position: absolute;
          top: 5px;
          right: 5px;
          cursor: pointer;
          display: block;
          background-color: #333333;
          color: #cccccc;
          padding: 0 5px;
        }

        .expand-collapse:hover {
          background-color: #555555;
        }

        .timestamp {
          font-size: 0.8em;
          color: #999;
        }

        body {
          margin: 0;
          display: flex;
          flex-direction: column;
          height: 100vh;
        }

        #messages {
          height: calc(100% - 100px);
          overflow-y: scroll;
          padding: 0 10px;
          padding-bottom: 20px;
          box-sizing: border-box;
        }

        #input-box-container {
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          position: fixed;
          bottom: 30px;
          width: calc(100% - 20px);
          height: 50px;
          padding: 0 10px;
          box-sizing: border-box;
        }

        #send-button {
          background-color: #4caf50;
          border: none;
          color: white;
          padding: 5px 10px;
          text-align: center;
          text-decoration: none;
          display: inline-block;
          font-size: 14px;
          margin: 0 0 0 10px;
          cursor: pointer;
          border-radius: 3px;
          height: 100%;
          box-sizing: border-box;
        }

        #input-box {
          flex-grow: 1;
          resize: none;
          height: 100%;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 3px;
          margin-right: 10px;
          box-sizing: border-box;
        }

        .thinking {
          position: fixed;
          left: 30%;
          bottom: 100px;
          transform: translate(-30%, 0);
          background-color: #ff9900;
          color: white;
          padding: 5px 10px;
          border-radius: 5px;
          display: none;
        }

        #retry-button {
          margin-top:5px;
        }
      </style>
      <script>
        function escapeHtml(text) {
          const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
          };

          return text.replace(/[&<>"']/g, function (m) {
            return map[m];
          }).replace(/\\n/g, '<br>');
        }

        const vscode = acquireVsCodeApi();

        window.addEventListener('message', event => {
          const message = event.data;

          if (message.type === 'clearMessages') {
            clearMessages();
          } else if (message.type === 'showThinking') {
            showThinking(message.pendingMessages);
          } else if (message.type === 'hideThinking') {
            hideThinking();
          }else if (message.type === 'httpError') {
            showThinking(message.pendingMessages, message.errorMessage);
          } else {
            const messageDiv = document.createElement('div');
            messageDiv.className = message.type;
            messageDiv.innerHTML = message.type === 'sent'
            ? \`<strong>You:</strong> <span class="timestamp">(\${message.timestamp})</span><br>\${message.fileName ? \`<p>File: \${message.fileName}</p>\` : ''}<p>\${escapeHtml(message.action)}</p>\${message.code ? \`<div class="code" onclick="toggleExpand(this)">\${escapeHtml(message.code)}<span class="expand-collapse">[+]</span></div>\` : ''}\`
            : \`<strong>ChatGPT:</strong> <span class="timestamp">(\${message.timestamp})</span><br><p>\${message.content}</p>\`;

            document.getElementById('messages').appendChild(messageDiv);

            scrollToBottom();
          }
        });

        function clearMessages() {
          document.getElementById('messages').innerHTML = '';
        }

        let thingingRetryTimeout = null;

        function showThinking(pendingMessageLength, errorMessage = "") {
          const thinkingDiv = document.getElementById('thinking');
          let showRetryButtonSec = 10000;

          if (errorMessage != ""){
            thinkingDiv.innerHTML = \`<strong class="warring">Error: \${errorMessage}</strong>\`;
            showRetryButtonSec = 1000;
          } else if (pendingMessageLength === 0) {
            thinkingDiv.innerHTML = '<strong>ChatGPT is thinking...</strong>';
          } else {
            thinkingDiv.innerHTML =\`<strong>ChatGPT is thinking... <br>(pending messages: \${pendingMessageLength})</strong>\`;
          }
          thinkingDiv.innerHTML = thinkingDiv.innerHTML + '<button id="retry-button">Retry</button>';
          document.getElementById('retry-button').style.display = 'none';

          document.getElementById('retry-button').addEventListener('click', () => {
            vscode.postMessage({ type: 'retryLast' });
          });

          if (timeoutId) {
            clearTimeout(thingingRetryTimeout);
          }

          thingingRetryTimeout = setTimeout(() => {
            if (document.getElementById('retry-button')) {
              document.getElementById('retry-button').style.display = 'block';
            }
          }, showRetryButtonSec);

          thinkingDiv.style.display = 'block';
        }

        function hideThinking() {
          const thinkingDiv = document.getElementById('thinking');
          thinkingDiv.innerHTML = '';
          thinkingDiv.style.display = 'none';
        }

        function toggleExpand(element) {
          element.classList.toggle('expanded');
          const expandSymbol = element.querySelector('.expand-collapse');
          expandSymbol.textContent = expandSymbol.textContent === '[+]' ? '[-]' : '[+]';
        }

        function scrollToBottom() {
          const messagesDiv = document.getElementById('messages');
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
      </script>
    </head>
    <body>
      <div id="messages"></div>
      <div id="thinking" class="thinking"></div>
      <div id="input-box-container">
        <textarea id="input-box" placeholder="Type your message..."></textarea>
        <button id="send-button">Send</button>
      </div>
      <script>
        document.getElementById('send-button').addEventListener('click', () => {
          submitInput();
        });

        let timeoutId = null;

        document.getElementById('input-box').addEventListener('keydown', function (event) {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
            event.preventDefault();

            timeoutId = setTimeout(() => {
              submitInput();
            }, 50);
          }
        });

        document.getElementById('input-box').addEventListener('keyup', function (event) {
          if (event.key === 'Enter') {
            clearTimeout(timeoutId);
          }
        });

        function submitInput() {
          const inputBox = document.getElementById('input-box');
          const message = inputBox.value.trim();
          if (message) {
            vscode.postMessage({ type: 'inputBoxMessage', content: message });
            inputBox.value = '';
          }
        }
      </script>
      </body>
      </html>
    `
  }

  private loadCachedMessages() {
    if (this._view && this.messageCache.length > 0) {
      for (const message of this.messageCache) {
        this._view.webview.postMessage(message);
      }

      if (this.messageCache[this.messageCache.length - 1].type === 'sent') {
        this._view.webview.postMessage({ type: 'showThinking', pendingMessages: this.pendingQueues.length });
      }
    }
  }

  public openPanel() {
    if (this._view) {
      this._view.show(true);
    }
  }

  async sendCodeAndDisplayResult(action: string, code?: string, askOnly: boolean = false) {
    const sentTimestamp = new Date().toLocaleTimeString();

    const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
    const fileName = filePath ? filePath.split('/').pop() : '';

    const sentMessage = { type: 'sent', action: action, code: code || '', fileName: fileName, timestamp: sentTimestamp, askOnly: askOnly };
    this.pendingQueues.push(sentMessage);

    if (this.isSending === true && this._view) {
      this._view.webview.postMessage({ type: 'showThinking', pendingMessages: this.pendingQueues.length });
      return false;
    }

    const firstInQueue = this.pendingQueues.shift();

    if (firstInQueue) {
      await this.sendRequest(firstInQueue);
    }
  }

  async sendRequest(message: { type: string; action: string; code: string; fileName: string; timestamp: string, askOnly: boolean }, newMessage: boolean = true) {
    let messageText = "";

    if (message.code && message.askOnly === false) {
      messageText = `
      As an engineer,
      code in "${message.fileName}",
      please "${message.action}" for this code: \n
      ${message.code}
      `;
    } else if (message.code && message.askOnly === true) {
      messageText = `
      code in "${message.fileName}" \n
      ${message.action} \n
      code:
      ${message.code}
      `;
    } else {
      messageText = message.action;
    }

    if (newMessage === true) {
      this.messageCache.push(message);
      this._globalState.update("messageCache", this.messageCache);
    }

    if (this._view) {
      if (newMessage === true) {
        this._view.webview.postMessage(message);
      }

      this._view.webview.postMessage({ type: 'showThinking', pendingMessages: this.pendingQueues.length });
    }

    try {
      this.isSending = true;

      const response = await axios.post('http://localhost:3000/send-message', {
        message: messageText
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
        const firstInQueue = this.pendingQueues.shift();

        if (firstInQueue) {
          await this.sendRequest(firstInQueue);
        }
      }
    } catch (error: any) {
      if (this._view) {
        const errorMessage = error.response.data.message;
        this._view.webview.postMessage({ type: 'httpError', pendingMessages: this.pendingQueues.length, errorMessage: error.message });
      }
    }

    this.isSending = false;
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
          let selectedText = '';
          const editor = vscode.window.activeTextEditor;

          if (editor) {
            selectedText = editor.document.getText(editor.selection);
          }

          viewProvider.openPanel();
          viewProvider.sendCodeAndDisplayResult(question, selectedText, true);
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-web-chatgpt.clearMessageCache', () => {
      viewProvider.clearMessageCache();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-web-chatgpt.openPanel', () => {
      viewProvider.openPanel();
    })
  );

  vscode.commands.executeCommand('workbench.view.extension.web-chatgpt-container');
  vscode.commands.executeCommand('web-chatgpt-panel.focus');
}

export function deactivate() { }

