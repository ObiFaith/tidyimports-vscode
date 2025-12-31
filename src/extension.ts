import * as vscode from "vscode";

interface Statement {
  lines: string[];
  isSingleLine: boolean;
  isTypeImport: boolean;
  isExport: boolean;
  length: number;
  originalIndex: number;
}

interface Separator {
  content: string;
  index: number;
  type: "comment" | "dynamic" | "require";
}

interface Group {
  statements: Statement[];
  startIndex: number;
  endIndex: number;
}

export function activate(context: vscode.ExtensionContext) {
  // Register the format-on-save handler
  const disposable = vscode.workspace.onWillSaveTextDocument(event => {
    const document = event.document;

    // Only process supported file types
    if (isSupportedFile(document)) {
      const edit = tidyImports(document);
      if (edit) {
        event.waitUntil(Promise.resolve([edit]));
      }
    }
  });

  context.subscriptions.push(disposable);
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
  const lines = text.split("\n");

  // Step 1: Detect import/export block
  const blockInfo = detectBlock(lines);
  if (!blockInfo) {
    return null;
  }

  const { startLine, endLine, preBlock, postBlock } = blockInfo;
  const blockLines = lines.slice(startLine, endLine + 1);

  // Step 2: Identify separators and groups
  const { separators, groups } = parseBlockIntoGroups(blockLines);

  // Step 3: Parse and process statements
  const allTypeImports: Statement[] = [];
  const processedGroups: Group[] = [];

  groups.forEach(group => {
    const statements = parseStatements(
      blockLines.slice(group.startIndex, group.endIndex + 1),
      group.startIndex
    );

    // Extract type imports globally
    const regularStatements: Statement[] = [];
    statements.forEach(stmt => {
      if (stmt.isTypeImport) {
        allTypeImports.push(stmt);
      } else {
        regularStatements.push(stmt);
      }
    });

    // Sort named imports within each statement
    regularStatements.forEach(sortNamedImports);

    // Calculate lengths
    regularStatements.forEach(calculateLength);

    // Sort by length
    regularStatements.sort((a, b) => {
      if (a.length !== b.length) {
        return a.length - b.length;
      }
      return a.lines[0].localeCompare(b.lines[0]);
    });

    processedGroups.push({
      statements: regularStatements,
      startIndex: group.startIndex,
      endIndex: group.endIndex,
    });
  });

  // Process type imports
  allTypeImports.forEach(sortNamedImports);
  allTypeImports.forEach(calculateLength);
  allTypeImports.sort((a, b) => {
    if (a.length !== b.length) {
      return a.length - b.length;
    }
    return a.lines[0].localeCompare(b.lines[0]);
  });

  // Step 4: Reconstruct block
  const reconstructed = reconstructBlock(
    processedGroups,
    separators,
    allTypeImports
  );

  // Step 5: Build final content
  const finalContent = [...preBlock, ...reconstructed, ...postBlock].join("\n");

  // Create edit
  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(text.length)
  );

  return vscode.TextEdit.replace(fullRange, finalContent);
}

function detectBlock(
  lines: string[]
): {
  startLine: number;
  endLine: number;
  preBlock: string[];
  postBlock: string[];
} | null {
  let startLine = -1;
  let endLine = -1;

  // Find start
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (
      trimmed.startsWith("import ") ||
      trimmed.startsWith("export ") ||
      (trimmed.startsWith("const ") &&
        (trimmed.includes("require(") || trimmed.includes("import(")))
    ) {
      startLine = i;
      break;
    }
  }

  if (startLine === -1) {
    return null;
  }

  // Find end
  for (let i = startLine; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Check if it's an import/export/require/dynamic line or part of multi-line
    const isImportExportLine =
      trimmed.startsWith("import ") ||
      trimmed.startsWith("export ") ||
      (trimmed.startsWith("const ") &&
        (trimmed.includes("require(") || trimmed.includes("import("))) ||
      trimmed === "" ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.includes("from ") ||
      trimmed === "}" ||
      trimmed.endsWith("} from");

    if (!isImportExportLine && trimmed !== "") {
      endLine = i - 1;
      break;
    }
  }

  if (endLine === -1) {
    endLine = lines.length - 1;
  }

  return {
    startLine,
    endLine,
    preBlock: lines.slice(0, startLine),
    postBlock: lines.slice(endLine + 1),
  };
}

function parseBlockIntoGroups(blockLines: string[]): {
  separators: Separator[];
  groups: Group[];
} {
  const separators: Separator[] = [];
  const groups: Group[] = [];

  let currentGroupStart = 0;

  for (let i = 0; i < blockLines.length; i++) {
    const line = blockLines[i].trim();

    // Check for separators
    if (line.startsWith("//") || line.startsWith("/*")) {
      // Standalone comment
      if (i > currentGroupStart) {
        groups.push({
          statements: [],
          startIndex: currentGroupStart,
          endIndex: i - 1,
        });
      }
      separators.push({ content: blockLines[i], index: i, type: "comment" });
      currentGroupStart = i + 1;
    } else if (line.startsWith("const ") && line.includes("import(")) {
      // Dynamic import
      if (i > currentGroupStart) {
        groups.push({
          statements: [],
          startIndex: currentGroupStart,
          endIndex: i - 1,
        });
      }
      separators.push({ content: blockLines[i], index: i, type: "dynamic" });
      currentGroupStart = i + 1;
    } else if (line.startsWith("const ") && line.includes("require(")) {
      // Require statement
      if (i > currentGroupStart) {
        groups.push({
          statements: [],
          startIndex: currentGroupStart,
          endIndex: i - 1,
        });
      }
      separators.push({ content: blockLines[i], index: i, type: "require" });
      currentGroupStart = i + 1;
    }
  }

  // Add final group
  if (currentGroupStart < blockLines.length) {
    groups.push({
      statements: [],
      startIndex: currentGroupStart,
      endIndex: blockLines.length - 1,
    });
  }

  return { separators, groups };
}

function parseStatements(lines: string[], offset: number): Statement[] {
  const statements: Statement[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === "" || line.startsWith("//") || line.startsWith("/*")) {
      i++;
      continue;
    }

    // Check if it's a multi-line import/export
    if (
      (line.startsWith("import ") || line.startsWith("export ")) &&
      line.includes("{") &&
      !line.includes("}")
    ) {
      // Multi-line
      const stmtLines: string[] = [lines[i]];
      i++;
      while (i < lines.length && !lines[i].includes("}")) {
        stmtLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        stmtLines.push(lines[i]); // Include closing line
      }

      statements.push({
        lines: stmtLines,
        isSingleLine: false,
        isTypeImport: stmtLines[0].trim().startsWith("import type"),
        isExport: stmtLines[0].trim().startsWith("export"),
        length: 0,
        originalIndex: offset + (i - stmtLines.length),
      });
      i++;
    } else if (line.startsWith("import ") || line.startsWith("export ")) {
      // Single-line
      statements.push({
        lines: [lines[i]],
        isSingleLine: true,
        isTypeImport: line.startsWith("import type"),
        isExport: line.startsWith("export"),
        length: 0,
        originalIndex: offset + i,
      });
      i++;
    } else {
      i++;
    }
  }

  return statements;
}

function sortNamedImports(statement: Statement): void {
  if (statement.isSingleLine) {
    const line = statement.lines[0];
    const match = line.match(/\{([^}]+)\}/);
    if (match) {
      const imports = match[1]
        .split(",")
        .map(s => s.trim())
        .filter(s => s);
      imports.sort();
      statement.lines[0] = line.replace(
        /\{([^}]+)\}/,
        `{ ${imports.join(", ")} }`
      );
    }
  } else {
    // Multi-line: extract names between braces
    const allText = statement.lines.join("\n");
    const match = allText.match(/\{([^}]+)\}/s);
    if (match) {
      const imports = match[1]
        .split(",")
        .map(s => s.trim())
        .filter(s => s);
      imports.sort();

      // Reconstruct multi-line with sorted imports
      const firstLine = statement.lines[0];
      const lastLine = statement.lines[statement.lines.length - 1];
      const indent = "  "; // Default indent

      statement.lines = [
        firstLine.substring(0, firstLine.indexOf("{") + 1),
        ...imports.map(imp => `${indent}${imp},`),
        lastLine,
      ];
    }
  }
}

function calculateLength(statement: Statement): void {
  if (statement.isSingleLine) {
    statement.length = statement.lines[0].length;
  } else {
    // Multi-line: use last line length
    statement.length =
      statement.lines[statement.lines.length - 1].trim().length;
  }
}

function reconstructBlock(
  groups: Group[],
  separators: Separator[],
  typeImports: Statement[]
): string[] {
  const result: string[] = [];
  let typeInserted = false;
  const typeLength = typeImports.length > 0 ? typeImports[0].length : Infinity;

  let separatorIdx = 0;

  groups.forEach((group, groupIdx) => {
    // Add statements from group
    group.statements.forEach(stmt => {
      // Check if we should insert types here
      if (!typeInserted && typeImports.length > 1 && stmt.length > typeLength) {
        result.push("// types");
        typeImports.forEach(typeStmt => {
          result.push(...typeStmt.lines);
        });
        typeInserted = true;
      } else if (
        !typeInserted &&
        typeImports.length === 1 &&
        stmt.length > typeLength
      ) {
        // Single type import, no comment
        typeImports.forEach(typeStmt => {
          result.push(...typeStmt.lines);
        });
        typeInserted = true;
      }

      result.push(...stmt.lines);
    });

    // Check if we should insert types at end of this group
    if (!typeInserted && typeImports.length > 1) {
      const lastStmtLength =
        group.statements.length > 0
          ? group.statements[group.statements.length - 1].length
          : 0;

      if (typeLength >= lastStmtLength || groupIdx === groups.length - 1) {
        result.push("// types");
        typeImports.forEach(typeStmt => {
          result.push(...typeStmt.lines);
        });
        typeInserted = true;
      }
    } else if (!typeInserted && typeImports.length === 1) {
      const lastStmtLength =
        group.statements.length > 0
          ? group.statements[group.statements.length - 1].length
          : 0;

      if (typeLength >= lastStmtLength || groupIdx === groups.length - 1) {
        // Single type import, no comment
        typeImports.forEach(typeStmt => {
          result.push(...typeStmt.lines);
        });
        typeInserted = true;
      }
    }

    // Add separator after group if exists
    if (separatorIdx < separators.length) {
      result.push(separators[separatorIdx].content);
      separatorIdx++;
    }
  });

  // If types still not inserted, add at end
  if (!typeInserted && typeImports.length > 1) {
    result.push("// types");
    typeImports.forEach(typeStmt => {
      result.push(...typeStmt.lines);
    });
  } else if (!typeInserted && typeImports.length === 1) {
    // Single type import, no comment
    typeImports.forEach(typeStmt => {
      result.push(...typeStmt.lines);
    });
  }

  return result;
}

export function deactivate() {}
