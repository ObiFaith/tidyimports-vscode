// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage('TidyImports: Document will save');
  vscode.workspace.onWillSaveTextDocument(async e => {
    console.log('[TidyImports] onWillSaveTextDocument triggered');
    const document = e.document;

    const originalText = document.getText();
    const updatedText = rearrangeImports(originalText);

    if (originalText === updatedText) {
      return;
    }

    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(originalText.length)
    );

    const edit = vscode.TextEdit.replace(fullRange, updatedText);
    e.waitUntil(Promise.resolve([edit]));
  });
}

function rearrangeImports(text: string): string {
  const lines = text.split('\n');

  const preImportLines: string[] = [];
  const importLines: string[] = [];
  const postImportLines: string[] = [];

  let reachedImports = false;
  let doneWithImports = false;

  for (const line of lines) {
    const trimmed = line.trim();

    const isImport =
      trimmed.startsWith('import') || /^from\s+.*\s+import\s+.*$/.test(trimmed);

    if (!reachedImports && !isImport) {
      preImportLines.push(line);
    } else if (!doneWithImports && isImport) {
      reachedImports = true;
      importLines.push(line);
    } else {
      doneWithImports = true;
      postImportLines.push(line);
    }
  }

  const sortedImports = importLines.sort((a, b) => {
    const lenDiff = a.trim().length - b.trim().length;
    return lenDiff !== 0 ? lenDiff : a.trim().localeCompare(b.trim());
  });

  return [...preImportLines, ...sortedImports, '', ...postImportLines].join(
    '\n'
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
