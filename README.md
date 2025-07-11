# TidyImports VS Code Extension

**TidyImports** is a Visual Studio Code extension that automatically sorts and tidies up import statements whenever you save a file. It ensures your imports are neatly ordered while preserving important directives like `'use client'` or top-level comments.

---

## ✨ Features

- 🔄 Automatically sorts `import` and `from ... import ...` statements on save

- 🚫 Preserves code above imports (like `'use client'`, comments, or directives)
- ✅ Supports JavaScript, TypeScript, and Python-style imports
- 💨 Lightweight and zero-configuration

---

## 🚀 Getting Started

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

Press `F5` or `Fn + F5` in VS Code to open a new window with the extension loaded.

## 🔧 How It Works

Whenever a supported file is about to be saved, TidyImports:

- Detects the block of import statements

- Sorts them by length and then alphabetically
- Leaves non-import lines untouched, especially anything above the imports
- Applies the changes just before save

## ⚙️ Activation Events

The extension activates for:

- JavaScript / TypeScript / Python files

- On workspace startup

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
'use client';

import y from 'y-lib';
import a from 'a-lib';
import z from 'z-library';
import b from 'b-lib';

const something = true;
```

**After Save:**

```ts
'use client';

import a from 'a-lib';
import b from 'b-lib';
import y from 'y-lib';
import z from 'z-library';

const something = true;
```

## 📜 License

MIT License

## 🙋‍♂️ Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you’d like to change.

## 💡 Author

Created with ❤️ by [Obi Faith](https://github.com/ObiFaith)
