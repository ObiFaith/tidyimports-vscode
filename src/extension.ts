import * as vscode from "vscode";
import * as t from "@babel/types";
import { parse } from "@babel/parser";

import traverse from "@babel/traverse";
import generate from "@babel/generator";

interface ImportStatement {
  node: t.ImportDeclaration;
  start: number;
  end: number;
  text: string;
  length: number;
  isTypeImport: boolean;
}

interface ExportStatement {
  node: t.ExportNamedDeclaration | t.ExportAllDeclaration;
  start: number;
  end: number;
  text: string;
  length: number;
}

interface DynamicImportStatement {
  text: string;
  start: number;
  end: number;
}

interface CommentStatement {
  text: string;
  start: number;
  end: number;
}

interface ImportBlock {
  statements: (
    | ImportStatement
    | ExportStatement
    | DynamicImportStatement
    | CommentStatement
  )[];
  start: number;
  end: number;
}

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("TidyImports");

  const disposable = vscode.workspace.onWillSaveTextDocument(event => {
    if (event.reason !== vscode.TextDocumentSaveReason.Manual) {
      return;
    }

    const document = event.document;

    if (isSupportedFile(document)) {
      try {
        const edit = tidyImports(document);
        if (edit) {
          event.waitUntil(Promise.resolve([edit]));
        }
      } catch (error) {
        outputChannel.appendLine(`TidyImports Error: ${error}`);
        vscode.window.showErrorMessage(
          "TidyImports: Failed to organize imports. Check output for details."
        );
      }
    }
  });

  context.subscriptions.push(disposable);
  context.subscriptions.push(outputChannel);
}

function isSupportedFile(document: vscode.TextDocument): boolean {
  const supportedLanguages = [
    "javascript",
    "typescript",
    "javascriptreact",
    "typescriptreact",
  ];
  return supportedLanguages.includes(document.languageId);
}

function tidyImports(document: vscode.TextDocument): vscode.TextEdit | null {
  const text = document.getText();

  if (!text.trim()) {
    return null;
  }

  try {
    // Parse with Babel
    const ast = parse(text, {
      sourceType: "module",
      plugins: [
        "jsx",
        "typescript",
        "decorators-legacy",
        "classProperties",
        "dynamicImport",
      ],
      errorRecovery: true,
    });

    // Extract imports, exports, and other statements
    const result = extractImportBlock(text, ast);

    if (!result || result.statements.length === 0) {
      return null;
    }

    // Organize imports
    const organized = organizeImports(result, text);

    // Build final content
    const preBlock = text.substring(0, result.start);
    const postBlock = text.substring(result.end);

    // Add blank line after imports if there's code following
    const needsBlankLine = postBlock.trim().length > 0;
    const finalContent =
      preBlock + organized + (needsBlankLine ? "\n" : "") + postBlock;

    // Create edit
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(text.length)
    );

    return vscode.TextEdit.replace(fullRange, finalContent);
  } catch (error) {
    console.error("TidyImports parsing error:", error);
    return null;
  }
}

function extractImportBlock(text: string, ast: any): ImportBlock | null {
  const lines = text.split("\n");
  const imports: ImportStatement[] = [];
  const exports: ExportStatement[] = [];
  const dynamics: DynamicImportStatement[] = [];
  const comments: CommentStatement[] = [];

  let firstStatementStart: number | null = null;
  let lastStatementEnd: number | null = null;

  // Extract imports and re-export statements
  traverse(ast, {
    ImportDeclaration(path) {
      const node = path.node;
      if (node.loc) {
        const start = node.loc.start.line - 1;
        const end = node.loc.end.line - 1;
        const statementText = lines.slice(start, end + 1).join("\n");

        const isTypeImport = node.importKind === "type";

        imports.push({
          node,
          start: node.start!,
          end: node.end!,
          text: statementText,
          length: calculateLength(statementText),
          isTypeImport,
        });

        if (firstStatementStart === null || node.start! < firstStatementStart) {
          firstStatementStart = node.start!;
        }
        if (lastStatementEnd === null || node.end! > lastStatementEnd) {
          lastStatementEnd = node.end!;
        }
      }
    },

    ExportNamedDeclaration(path) {
      const node = path.node;
      // Only handle re-exports (export { ... } from '...') or (export * from '...')
      if (node.source && node.loc) {
        const start = node.loc.start.line - 1;
        const end = node.loc.end.line - 1;
        const statementText = lines.slice(start, end + 1).join("\n");

        exports.push({
          node,
          start: node.start!,
          end: node.end!,
          text: statementText,
          length: calculateLength(statementText),
        });

        if (firstStatementStart === null || node.start! < firstStatementStart) {
          firstStatementStart = node.start!;
        }
        if (lastStatementEnd === null || node.end! > lastStatementEnd) {
          lastStatementEnd = node.end!;
        }
      }
    },

    ExportAllDeclaration(path) {
      const node = path.node;
      if (node.loc) {
        const start = node.loc.start.line - 1;
        const end = node.loc.end.line - 1;
        const statementText = lines.slice(start, end + 1).join("\n");

        exports.push({
          node,
          start: node.start!,
          end: node.end!,
          text: statementText,
          length: calculateLength(statementText),
        });

        if (firstStatementStart === null || node.start! < firstStatementStart) {
          firstStatementStart = node.start!;
        }
        if (lastStatementEnd === null || node.end! > lastStatementEnd) {
          lastStatementEnd = node.end!;
        }
      }
    },

    VariableDeclaration(path) {
      const node = path.node;
      // Check for dynamic imports: const x = import('...')
      // or require: const x = require('...')
      if (node.loc) {
        const start = node.loc.start.line - 1;
        const end = node.loc.end.line - 1;
        const statementText = lines.slice(start, end + 1).join("\n");

        const hasDynamicImport = node.declarations.some(
          decl =>
            decl.init &&
            t.isCallExpression(decl.init) &&
            (t.isImport(decl.init.callee) ||
              (t.isIdentifier(decl.init.callee) &&
                decl.init.callee.name === "require"))
        );

        if (hasDynamicImport) {
          dynamics.push({
            text: statementText,
            start: node.start!,
            end: node.end!,
          });

          if (
            firstStatementStart === null ||
            node.start! < firstStatementStart
          ) {
            firstStatementStart = node.start!;
          }
          if (lastStatementEnd === null || node.end! > lastStatementEnd) {
            lastStatementEnd = node.end!;
          }
        } else {
          // Not an import-related statement, stop here
          path.stop();
        }
      }
    },
  });

  // Extract comments in the import block
  if (
    ast.comments &&
    firstStatementStart !== null &&
    lastStatementEnd !== null
  ) {
    ast.comments.forEach((comment: any) => {
      if (
        comment.start >= firstStatementStart! &&
        comment.end <= lastStatementEnd!
      ) {
        const start = comment.loc.start.line - 1;
        const end = comment.loc.end.line - 1;
        const commentText = lines.slice(start, end + 1).join("\n");

        comments.push({
          text: commentText,
          start: comment.start,
          end: comment.end,
        });
      }
    });
  }

  if (firstStatementStart === null || lastStatementEnd === null) {
    return null;
  }

  // Combine all statements
  const allStatements = [...imports, ...exports, ...dynamics, ...comments].sort(
    (a, b) => a.start - b.start
  );

  return {
    statements: allStatements,
    start: firstStatementStart,
    end: lastStatementEnd,
  };
}

function calculateLength(text: string): number {
  const lines = text.split("\n");
  if (lines.length === 1) {
    return text.length;
  }
  // For multi-line, use last line length
  return lines[lines.length - 1].trim().length;
}

function organizeImports(block: ImportBlock, originalText: string): string {
  const { statements } = block;

  // Separate into categories
  const allImports: ImportStatement[] = [];
  const exportStatements: ExportStatement[] = [];
  const dynamicStatements: DynamicImportStatement[] = [];
  const commentStatements: CommentStatement[] = [];

  statements.forEach(stmt => {
    if (
      "node" in stmt &&
      t.isImportDeclaration((stmt as ImportStatement).node)
    ) {
      const importStmt = stmt as ImportStatement;
      allImports.push(importStmt);
    } else if (
      "node" in stmt &&
      (t.isExportNamedDeclaration((stmt as ExportStatement).node) ||
        t.isExportAllDeclaration((stmt as ExportStatement).node))
    ) {
      exportStatements.push(stmt as ExportStatement);
    } else if (
      "text" in stmt &&
      stmt.start !== undefined &&
      !("node" in stmt)
    ) {
      // Check if it's a comment or dynamic import
      if (
        stmt.text.trim().startsWith("//") ||
        stmt.text.trim().startsWith("/*")
      ) {
        commentStatements.push(stmt as CommentStatement);
      } else {
        dynamicStatements.push(stmt as DynamicImportStatement);
      }
    }
  });

  // Sort named imports within each import statement
  allImports.forEach(sortNamedImports);
  exportStatements.forEach(sortNamedExports);

  // Sort by length (type and regular imports together)
  allImports.sort(compareByLength);
  exportStatements.sort(compareByLength);

  // Build groups based on separators (comments and dynamic imports)
  const groups = buildGroups(
    allImports,
    exportStatements,
    commentStatements,
    dynamicStatements,
    statements
  );

  return groups.flat().join("\n");
}

function sortNamedImports(importStmt: ImportStatement): void {
  const node = importStmt.node;

  if (node.specifiers && node.specifiers.length > 0) {
    const defaultImport = node.specifiers.find(s =>
      t.isImportDefaultSpecifier(s)
    );
    const namespaceImport = node.specifiers.find(s =>
      t.isImportNamespaceSpecifier(s)
    );
    const namedImports = node.specifiers.filter(s =>
      t.isImportSpecifier(s)
    ) as t.ImportSpecifier[];

    // Sort named imports alphabetically
    namedImports.sort((a, b) => {
      const aName = t.isIdentifier(a.imported)
        ? a.imported.name
        : (a.imported as t.StringLiteral).value;
      const bName = t.isIdentifier(b.imported)
        ? b.imported.name
        : (b.imported as t.StringLiteral).value;
      return aName.localeCompare(bName);
    });

    // Reconstruct specifiers: default, namespace, then named
    const newSpecifiers = [];
    if (defaultImport) {
      newSpecifiers.push(defaultImport);
    }
    if (namespaceImport) {
      newSpecifiers.push(namespaceImport);
    }
    newSpecifiers.push(...namedImports);

    node.specifiers = newSpecifiers;

    // Regenerate text
    const generated = generate(node, {
      retainLines: false,
      compact: false,
    });

    importStmt.text = generated.code;
    importStmt.length = calculateLength(generated.code);
  }
}

function sortNamedExports(exportStmt: ExportStatement): void {
  const node = exportStmt.node;

  if (
    t.isExportNamedDeclaration(node) &&
    node.specifiers &&
    node.specifiers.length > 0
  ) {
    const namedExports = node.specifiers.filter(s =>
      t.isExportSpecifier(s)
    ) as t.ExportSpecifier[];

    // Sort alphabetically
    namedExports.sort((a, b) => {
      const aName = t.isIdentifier(a.exported)
        ? a.exported.name
        : (a.exported as t.StringLiteral).value;
      const bName = t.isIdentifier(b.exported)
        ? b.exported.name
        : (b.exported as t.StringLiteral).value;
      return aName.localeCompare(bName);
    });

    node.specifiers = namedExports;

    // Regenerate text
    const generated = generate(node, {
      retainLines: false,
      compact: false,
    });

    exportStmt.text = generated.code;
    exportStmt.length = calculateLength(generated.code);
  } else if (t.isExportAllDeclaration(node)) {
    // Regenerate for consistency
    const generated = generate(node, {
      retainLines: false,
      compact: false,
    });

    exportStmt.text = generated.code;
    exportStmt.length = calculateLength(generated.code);
  }
}

function compareByLength(
  a: ImportStatement | ExportStatement,
  b: ImportStatement | ExportStatement
): number {
  if (a.length !== b.length) {
    return a.length - b.length;
  }
  return a.text.localeCompare(b.text);
}

function buildGroups(
  imports: ImportStatement[],
  exports: ExportStatement[],
  comments: CommentStatement[],
  dynamics: DynamicImportStatement[],
  allStatements: any[]
): string[][] {
  // Create separators map
  const separators = [...comments, ...dynamics].sort(
    (a, b) => a.start - b.start
  );

  if (separators.length === 0) {
    // No separators, single group
    const group = [...imports, ...exports]
      .sort(compareByLength)
      .map(s => s.text);
    return [group];
  }

  // Build groups separated by comments and dynamic imports
  const groups: string[][] = [];
  let currentGroup: (ImportStatement | ExportStatement)[] = [];
  const allSorted = [...imports, ...exports].sort((a, b) => a.start - b.start);

  let sepIndex = 0;

  for (const stmt of allSorted) {
    // Check if there's a separator before this statement
    while (
      sepIndex < separators.length &&
      separators[sepIndex].end < stmt.start
    ) {
      if (currentGroup.length > 0) {
        // Sort the current group by length before adding
        currentGroup.sort(compareByLength);
        groups.push(currentGroup.map(s => s.text));
        currentGroup = [];
      }
      groups.push([separators[sepIndex].text]);
      sepIndex++;
    }

    currentGroup.push(stmt);
  }

  // Add remaining separators
  while (sepIndex < separators.length) {
    if (currentGroup.length > 0) {
      currentGroup.sort(compareByLength);
      groups.push(currentGroup.map(s => s.text));
      currentGroup = [];
    }
    groups.push([separators[sepIndex].text]);
    sepIndex++;
  }

  if (currentGroup.length > 0) {
    currentGroup.sort(compareByLength);
    groups.push(currentGroup.map(s => s.text));
  }

  return groups;
}

export function deactivate() {}
