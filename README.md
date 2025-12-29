# TidyImports

**TidyImports** is a Visual Studio Code extension that automatically sorts and tidies up import and export statements whenever you save a file. It ensures your imports and exports are neatly ordered while preserving important directives like `'use client'` or top-level comments.

---

## ✨ Features

- 🔄 Automatically sorts `import` and `export` statements on save
- 🚫 Preserves code above imports/exports (like `'use client'`, comments, or directives)
- ✅ Supports JavaScript and TypeScript files
- 💨 Lightweight and zero-configuration

> ⚠️ **Note**: Python-style imports (`from ... import ...`) are not currently supported.

## 🚀 Getting Started

If you install via the VS Code Marketplace, the extension works immediately—no build or setup needed.

If you want to develop or build from source:

### 1. Clone the repository

```bash
git clone https://github.com/ObiFaith/tidyimports-vscode.git
cd tidyimports-vscode
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the extension

```bash
npm run compile
```

### 4. Launch in Extension Development Host

Press `F5` (or `Fn + F5`) in VS Code to open a new window with the extension loaded.

## 🔧 How It Works

Whenever a supported file is about to be saved, TidyImports:

- Detects the block of import and export statements
- Sorts them by length, then alphabetically
- Preserves non-import/export lines, especially anything above imports/exports
- Applies the changes just before save

## ⚙️ Activation Events

The extension activates on save for:

- JavaScript (`.js`, `.jsx`)
- TypeScript (`.ts`, `.tsx`)

> Activation happens when you save a file, not at workspace startup.

## 📂 Folder Structure

```pgsql
.
├── .vscode/
├── src/
│   └── extension.ts
├── dist/
│   └── extension.js (compiled output)
├── package.json
├── tsconfig.json
└── README.md
```

## 🧪 Example

**Before:**

```ts
"use client";

import a from "a-lib";
import z from "z-library";

const something = true;
```

**After Save:**

```ts
"use client";

import a from "a-lib";
import z from "z-library";

const something = true;
```

## 📜 License

[MIT License](./LICENSE)

## 🙋‍♂️ Contributing

Pull requests are welcome!\
For major changes, please open an issue first to discuss what you’d like to change.

## 💡 Author

Created with ❤️ by [Faith Obi](https://github.com/ObiFaith)
