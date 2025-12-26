import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument(async e => {
      if (e.reason !== vscode.TextDocumentSaveReason.Manual) {
        return; // Only proceed on manual save (Ctrl + S)
      }

      const document = e.document;
      const originalText = document.getText();

      if (!originalText.includes("import")) {
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
  const lines = text.split("\n");

  const preImportLines: string[] = [];
  const importBlocks: string[][] = [];
  const postImportLines: string[] = [];

  let inImportBlock = false;
  let currentBlock: string[] = [];
  let startedImports = false;
  let endedImports = false;
  let emptyLineCount = 0;

  // Build import blocks
  for (const line of lines) {
    const trimmed = line.trim();
    const isImport = trimmed.startsWith("import");
    const isEmpty = trimmed === "";

    if (!startedImports && !isImport) {
      preImportLines.push(line);
      continue;
    }

    if (!endedImports) {
      if (isImport) {
        startedImports = true;
        currentBlock.push(line);
        emptyLineCount = 0;
        if (trimmed.endsWith(";")) {
          importBlocks.push(currentBlock);
          currentBlock = [];
        } else {
          inImportBlock = true;
        }
      } else if (inImportBlock) {
        if (!isEmpty) {
          currentBlock.push(line);
        }
        if (trimmed.endsWith(";")) {
          importBlocks.push(currentBlock);
          currentBlock = [];
          inImportBlock = false;
        }
      } else if (isEmpty) {
        emptyLineCount++;
        if (emptyLineCount > 2) {
          endedImports = true;
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

  // Sort import blocks
  importBlocks.sort((a, b) => {
    const lastLineA = a[a.length - 1].trim();
    const lastLineB = b[b.length - 1].trim();

    const lengthDiff = lastLineA.length - lastLineB.length;
    if (lengthDiff !== 0) {
      return lengthDiff;
    }

    return extractFromPath(lastLineA).localeCompare(extractFromPath(lastLineB));
  });

  // Post-process multi-line imports
  const sortedImports = importBlocks.map(sortMultiLineImport).flat();

  return [...preImportLines, ...sortedImports, "", ...postImportLines].join(
    "\n"
  );
}

//  Sort multi-line import members
function sortMultiLineImport(block: string[]): string[] {
  if (block.length <= 1 || !block[0].includes("{")) {
    return block;
  }

  const firstLine = block[0];
  const lastLine = block[block.length - 1];

  // Collect middle lines as { originalLine, trimmedName }
  const middleLines = block
    .slice(1, -1)
    .map(line => {
      const trimmed = line.trim().replace(/,?$/, ""); // remove trailing comma for comparison
      return { original: line, name: trimmed };
    })
    .filter(l => l.name);

  // Sort by length, then alphabetically (based on the name)
  middleLines.sort((a, b) => {
    const lenDiff = a.name.length - b.name.length;
    return lenDiff !== 0 ? lenDiff : a.name.localeCompare(b.name);
  });

  // Return first line + sorted original lines + last line
  return [firstLine, ...middleLines.map(l => l.original), lastLine];
}

function extractFromPath(importStatement: string): string {
  const match = importStatement.match(/from\s+['"]([^'"]+)['"]/);
  return match ? match[1] : "";
}

export function deactivate() {}
