// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage('TidyImports: Tidying your imports!');
  vscode.workspace.onWillSaveTextDocument(async e => {
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
  const importBlocks: string[][] = [];
  const postImportLines: string[] = [];

  let inImportBlock = false;
  let currentImportBlock: string[] = [];

  let reachedImports = false;
  let doneWithImports = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const isImportStart = trimmed.startsWith('import');

    if (!reachedImports && !isImportStart) {
      preImportLines.push(line);
      continue;
    }

    if (!doneWithImports) {
      if (isImportStart) {
        reachedImports = true;
        inImportBlock = true;
        currentImportBlock.push(line);

        // If it's a single-line import, end the block immediately
        if (trimmed.endsWith(';')) {
          importBlocks.push([...currentImportBlock]);
          currentImportBlock = [];
          inImportBlock = false;
        }
      } else if (inImportBlock) {
        currentImportBlock.push(line);

        // Check if the current line ends the import
        if (trimmed.endsWith(';')) {
          importBlocks.push([...currentImportBlock]);
          currentImportBlock = [];
          inImportBlock = false;
        }
      } else {
        doneWithImports = true;
        postImportLines.push(line);
      }
    } else {
      postImportLines.push(line);
    }
  }

  // In case the file ends with an unterminated import block
  if (currentImportBlock.length > 0) {
    importBlocks.push([...currentImportBlock]);
  }

  // Sort blocks by their string representation
  const sortedImports = importBlocks
    .map(block => ({
      content: block,
      keyLength:
        block.length === 1
          ? block[0].length
          : block[block.length - 1].trim().length,
    }))
    .sort((a, b) => {
      const lenDiff = a.keyLength - b.keyLength;
      if (lenDiff !== 0) {
        return lenDiff;
      }
      return a.content.join('\n').localeCompare(b.content.join('\n'));
    })
    .map(block => block.content.join('\n'));

  return [...preImportLines, ...sortedImports, '', ...postImportLines].join(
    '\n'
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
