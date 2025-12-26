import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument(e => {
      if (e.reason !== vscode.TextDocumentSaveReason.Manual) {
        return;
      }

      const document = e.document;
      const originalText = document.getText();

      if (
        !originalText.includes("import") &&
        !originalText.includes("export")
      ) {
        return;
      }

      // Imports first, exports second (guaranteed order)
      const withSortedImports = rearrangeSection(originalText, "import");
      const finalText = rearrangeSection(withSortedImports, "export");

      if (originalText === finalText) {
        return;
      }

      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(originalText.length)
      );

      e.waitUntil(
        Promise.resolve([vscode.TextEdit.replace(fullRange, finalText)])
      );
    })
  );
}

function rearrangeSection(text: string, keyword: "import" | "export"): string {
  const lines = text.split("\n");

  const pre: string[] = [];
  const blocks: string[][] = [];
  const post: string[] = [];

  let started = false;
  let ended = false;
  let inBlock = false;
  let emptyCount = 0;
  let current: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const isTarget = trimmed.startsWith(keyword);
    const isEmpty = trimmed === "";

    if (!started && !isTarget) {
      pre.push(line);
      continue;
    }

    if (!ended) {
      if (isTarget) {
        started = true;
        current.push(line);
        emptyCount = 0;

        if (trimmed.endsWith(";")) {
          blocks.push(current);
          current = [];
        } else {
          inBlock = true;
        }
      } else if (inBlock) {
        if (!isEmpty) {
          current.push(line);
        }

        if (trimmed.endsWith(";")) {
          blocks.push(current);
          current = [];
          inBlock = false;
        }
      } else if (isEmpty) {
        emptyCount++;
        if (emptyCount > 2) {
          ended = true;
        }
      } else {
        ended = true;
        post.push(line);
      }
    } else {
      post.push(line);
    }
  }

  if (current.length) {
    blocks.push(current);
  }
  if (!blocks.length) {
    return text;
  }

  blocks.sort(sortBlocks);

  const sorted = blocks.map(sortMultiLineMembers).flat();

  return [...pre, ...sorted, "", ...post].join("\n");
}

function sortBlocks(a: string[], b: string[]): number {
  const lastA = a[a.length - 1].trim();
  const lastB = b[b.length - 1].trim();

  const lenDiff = lastA.length - lastB.length;
  if (lenDiff !== 0) {
    return lenDiff;
  }

  return extractFromPath(lastA).localeCompare(extractFromPath(lastB));
}

function sortMultiLineMembers(block: string[]): string[] {
  if (block.length <= 1 || !block[0].includes("{")) {
    return block;
  }

  const first = block[0];
  const last = block[block.length - 1];

  const middle = block
    .slice(1, -1)
    .map(line => ({
      original: line,
      name: line.trim().replace(/,?$/, ""),
    }))
    .filter(l => l.name);

  middle.sort((a, b) => {
    const lenDiff = a.name.length - b.name.length;
    return lenDiff !== 0 ? lenDiff : a.name.localeCompare(b.name);
  });

  return [first, ...middle.map(l => l.original), last];
}

// Helper to extract path from import/export for block sorting
function extractFromPath(statement: string): string {
  const match = statement.match(/from\s+['"]([^'"]+)['"]/);
  return match ? match[1] : "";
}

export function deactivate() {}
