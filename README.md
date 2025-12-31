# TidyImports

TidyImports is a Visual Studio Code extension that intelligently sorts and formats your import and export statements, creating clean, consistent, and visually organized code that's easier to read and maintain.

> Automatically organize and format your JavaScript/TypeScript imports on save.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://marketplace.visualstudio.com/items?itemName=tidyimports)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 📋 Table of Contents

- [Features](#features)
- [Supported File Types](#supported-file-types)
- [Installation](#installation)
- [Usage](#usage)
- [How It Works](#how-it-works)
- [Examples](#examples)
- [Technical Details](#technical-details)
- [Why TidyImports](#why-tidyimports)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### 🎯 Smart Length-Based Sorting

TidyImports sorts your imports based on their character length, creating a visually pleasing ascending pattern:

```typescript
// Before
import { Button } from "./components/Button";
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// After
import React from "react";
import { Button } from "./components/Button";
import { BrowserRouter, Routes, Route } from "react-router-dom";
```

### 📦 Multi-Line Import Handling

For multi-line imports (typically created by Prettier when exceeding line length limits), TidyImports uses the **last line length** for sorting, ensuring proper placement even after formatting:

```typescript
// Before
import { BrowserRouter, Routes, Route } from "react-router-dom";
import {
  Home,
  Login,
  Layout,
  Signup,
  ApiHandler,
  OrderSummary,
  ForgotPassword,
  ProductDetails,
} from ".";

// After (last line "} from '.';" is ~13 chars, so it goes first)
import {
  Home,
  Login,
  Layout,
  Signup,
  ApiHandler,
  OrderSummary,
  ForgotPassword,
  ProductDetails,
} from ".";
import { BrowserRouter, Routes, Route } from "react-router-dom";
```

### 🔤 Alphabetical Named Import Sorting

Named imports within curly braces are automatically sorted alphabetically:

```typescript
// Before
import { useState, useEffect, useCallback, useMemo } from "react";

// After
import { useCallback, useEffect, useMemo, useState } from "react";
```

> This works for both single-line and multi-line imports:

### 🔷 TypeScript Type Import Grouping

Type imports are collected globally and positioned as a group based on the shortest type import's length. When there are **2 or more type imports**, they're preceded by a `// types` comment:

```typescript
// Before
import React from "react";
import type { User } from "./types";
import { api } from "./api";
import type { Config } from "./config";

// After
import React from "react";
import { api } from "./api";
// types
import type { Config } from "./config";
import type { User } from "./types";
```

### 📝 Comment-Based Grouping

Standalone comments create natural boundaries, with imports sorted within each group:

```typescript
// Before
import { db } from "./db";
import React from "react";
// Core utilities
import { api } from "./api";
import { auth } from "./auth";

// After
import React from "react";
import { db } from "./db";
// Core utilities
import { api } from "./api";
import { auth } from "./auth";
```

### ⚡ Dynamic Import Separation

Dynamic imports (`const x = import(...)`) act as group separators:

```typescript
// Before
import { api } from "./api";
import React from "react";
const LazyComponent = import("./Lazy");
import { db } from "./db";

// After
import React from "react";
import { api } from "./api";
const LazyComponent = import("./Lazy");
import { db } from "./db";
```

### 📦 CommonJS Support

CommonJS `require()` statements are treated as separators, maintaining Node.js compatibility:

```typescript
// Before
import { api } from "./api";
import React from "react";
const fs = require("fs");
import { db } from "./db";

// After
import React from "react";
import { api } from "./api";
const fs = require("fs");
import { db } from "./db";
```

### 🎨 Side-Effect Import Handling

Side-effect imports (like CSS imports) are sorted just like regular imports:

```typescript
// Before
import "slick-carousel/slick/slick-theme.css";
import React from "react";
import "slick-carousel/slick/slick.css";

// After
import React from "react";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
```

### 🧹 Clean Formatting

- Removes unnecessary blank lines between imports
- Preserves comments and their relationships with imports
- Maintains consistent formatting across your codebase

---

## 📦 Supported File Types

TidyImports works automatically with:

- ✅ JavaScript (`.js`)
- ✅ TypeScript (`.ts`)
- ✅ React/JSX (`.jsx`)
- ✅ React/TSX (`.tsx`)

## How It Works

1. **On Save Trigger**: TidyImports activates when you save a supported file
2. **Import Detection**: Identifies the import/export block at the top of your file
3. **Group Analysis**: Recognizes natural groups separated by comments, dynamic imports, or require statements
4. **Type Collection**: Gathers all TypeScript type imports globally
5. **Sorting**:
   - Sorts named imports alphabetically within each statement
   - Calculates length (last line for multi-line imports)
   - Sorts by length (ascending) within each group
6. **Type Positioning**: Places the type import group based on the shortest type import's length
7. **Reconstruction**: Rebuilds your import block with proper formatting
8. **Application**: Applies changes seamlessly before save completes

---

## 🚀 Installation

### From VS Code Marketplace (Coming Soon)

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "TidyImports"
4. Click Install

### Manual Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run compile`
4. Press `F5` to open a new VS Code window with the extension loaded

---

## 💡 Usage

TidyImports works automatically! Simply:

1. Write your code with imports in any order
2. Save your file (`Ctrl+S` or `Cmd+S`)
3. Watch your imports organize themselves ✨

### Before TidyImports:

```typescript
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import {
  Home,
  Login,
  ProductDetails,
  ForgotPassword,
  Layout,
  OrderSummary,
  Signup,
  ApiHandler,
} from ".";
import { BrowserRouter, Routes, Route } from "react-router-dom";
```

### After TidyImports:

```typescript
import {
  ApiHandler,
  ForgotPassword,
  Home,
  Layout,
  Login,
  OrderSummary,
  ProductDetails,
  Signup,
} from ".";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
```

## Configuration

TidyImports works out of the box with sensible defaults. Currently, no configuration options are needed.

## Why TidyImports?

### 🎯 Consistency Across Your Team

No more debates about import ordering. TidyImports enforces a consistent, logical pattern that everyone can follow.

### 🚀 Save Time

Stop manually organizing imports. Let TidyImports do it automatically every time you save.

### 👀 Improved Readability

The ascending length pattern creates a visual hierarchy that makes it easier to scan and understand your imports at a glance.

### 🤝 Works With Your Tools

TidyImports is designed to work seamlessly with Prettier, ESLint, and other formatting tools. It understands multi-line imports created by Prettier's line length limits.

### 🔄 Reduces Git Conflicts

Consistent import ordering means fewer merge conflicts when multiple developers work on the same files.

## Technical Details

### Length Calculation

- **Single-line imports**: Total character count of the entire line
- **Multi-line imports**: Character count of the **last line only** (the closing line with `} from "...";`)

This approach works perfectly with formatters like Prettier that break long imports across multiple lines based on configured line length limits (typically 80 or 100 characters).

### Grouping Logic

Imports are divided into groups by:

1. **Standalone comments**: Comments on their own line
2. **Dynamic imports**: `const x = import(...)`
3. **Require statements**: `const x = require(...)`

Each group is sorted independently by length, then groups are reassembled with their separators preserved.

### Type Import Handling

- All `import type` statements are collected globally (removed from their original groups)
- They're sorted by length within the type group
- The entire type group is positioned based on where the **shortest type import** would fit length-wise
- If there are 2+ type imports, they're preceded by a `// types` comment for clarity

## Examples

### Example 1: Basic Sorting

```typescript
// Before
import { Button, Input, Select, Checkbox } from "./components";
import React from "react";
import { api } from "./api";

// After
import React from "react";
import { api } from "./api";
import { Button, Checkbox, Input, Select } from "./components";
```

### Example 2: With Comments

```typescript
// Before
import { config } from "./config";
// Third-party libraries
import React from "react";
import lodash from "lodash";
// Local utilities
import { helper } from "./helper";

// After
import { config } from "./config";
// Third-party libraries
import lodash from "lodash";
import React from "react";
// Local utilities
import { helper } from "./helper";
```

### Example 3: With Type Imports

```typescript
// Before
import type { User } from "./types/user";
import React, { useState } from "react";
import type { Product } from "./types/product";
import { api } from "./services/api";
import type { Order } from "./types/order";

// After
import React, { useState } from "react";
import { api } from "./services/api";
// types
import type { Order } from "./types/order";
import type { User } from "./types/user";
import type { Product } from "./types/product";
```

### Example 4: Complex Real-World Example

```typescript
// Before
import "slick-carousel/slick/slick-theme.css";
import {
  ProductDetails,
  Home,
  ForgotPassword,
  OrderSummary,
  Login,
  Signup,
  Layout,
} from "./pages";
import type { AppConfig } from "./types";
// Router
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { useEffect, useState } from "react";
import "slick-carousel/slick/slick.css";
const analytics = import("./analytics");
import type { User } from "./types";
import { ApiHandler } from "./services";

// After
import React, { useEffect, useState } from "react";
import {
  ForgotPassword,
  Home,
  Layout,
  Login,
  OrderSummary,
  ProductDetails,
  Signup,
} from "./pages";
import { ApiHandler } from "./services";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
// Router
import { BrowserRouter, Route, Routes } from "react-router-dom";
const analytics = import("./analytics");
// types
import type { User } from "./types";
import type { AppConfig } from "./types";
```

## Known Limitations

- Only processes imports/exports at the top of the file (before any code)
- Does not modify dynamic imports within functions or conditionals
- Requires well-formed import/export syntax

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

If you encounter any issues or have suggestions, please [open an issue](https://github.com/yourusername/tidyimports/issues) on GitHub.

---

**Made with ❤️ for cleaner code**

Enjoy TidyImports? Don't forget to ⭐ star the repo and share it with your team!
