import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument(async e => {
      if (e.reason !== vscode.TextDocumentSaveReason.Manual) {
        return; // Only proceed on manual save (Ctrl + S)
      }

      const document = e.document;
      const originalText = document.getText();

      if (!originalText.includes('import')) {
        return; // Skip processing if there's no import
      }

      const updatedText = rearrangeImports(originalText);
      if (originalText === updatedText) {
        return; // Skip if no changes are needed
      }

      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(originalText.length)
      );

      const edit = vscode.TextEdit.replace(fullRange, updatedText);
      e.waitUntil(Promise.resolve([edit]));
    })
  );
}

function rearrangeImports(text: string): string {
  const lines = text.split('\n');

  const preImportLines: string[] = [];
  const importBlocks: string[][] = [];
  const postImportLines: string[] = [];

  let inImportBlock = false;
  let currentBlock: string[] = [];
  let startedImports = false;
  let endedImports = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const isImport = trimmed.startsWith('import');

    if (!startedImports && !isImport) {
      preImportLines.push(line);
      continue;
    }

    if (!endedImports) {
      if (isImport) {
        startedImports = true;
        currentBlock.push(line);
        if (trimmed.endsWith(';')) {
          importBlocks.push(currentBlock);
          currentBlock = [];
        } else {
          inImportBlock = true;
        }
      } else if (inImportBlock) {
        currentBlock.push(line);
        if (trimmed.endsWith(';')) {
          importBlocks.push(currentBlock);
          currentBlock = [];
          inImportBlock = false;
        }
      } else {
        endedImports = true;
        postImportLines.push(line);
      }
    } else {
      postImportLines.push(line);
    }
  }

  if (currentBlock.length > 0) {
    importBlocks.push(currentBlock);
  }

  // Sort import blocks efficiently
  importBlocks.sort((a, b) => {
    const lastLineA = a[a.length - 1].trim();
    const lastLineB = b[b.length - 1].trim();

    const lengthDiff = lastLineA.length - lastLineB.length;
    if (lengthDiff !== 0) {
      return lengthDiff; // Shorter last line first
    }

    const fromA = extractFromPath(lastLineA);
    const fromB = extractFromPath(lastLineB);
    return fromA.localeCompare(fromB);
  });

  const sortedImports = importBlocks.map(block => block.join('\n'));

  return [...preImportLines, ...sortedImports, '', ...postImportLines].join(
    '\n'
  );
}

function extractFromPath(importStatement: string): string {
  const match = importStatement.match(/from\s+['"]([^'"]+)['"]/);
  return match ? match[1] : '';
}

export function deactivate() {}
