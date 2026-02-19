# AGENTS.md - Developer Guidelines for RehersalPlaner

## Project Overview

This is a full-stack web application for musicians to vote on rehearsal dates. The admin creates rehearsals with multiple date options, and users vote on their preferred dates.

## Tech Stack

- **Frontend**: Vanilla TypeScript, HTML, CSS
- **Backend**: Node.js with Express
- **Storage**: JSON file-based (data.json)
- **Compilation**: TypeScript

---

## Build & Run Commands

### Install Dependencies
```bash
npm install
```

### Development
```bash
npm start        # Start server on port 3001
npm run dev      # Same as npm start
```

### TypeScript Compilation
```bash
npm run build    # Compile TypeScript to JavaScript
npm run watch    # Watch mode - auto-rebuild on changes
```

### Testing
This project does not currently have a test framework. If tests are added:
```bash
# Run all tests
npm test

# Run a single test file
npm test -- filename.test.ts

# Run tests in watch mode
npm test -- --watch
```

---

## Project Structure

```
/rehersalPlaner
├── server.js          # Express backend (CommonJS)
├── data.json          # JSON database (auto-created)
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── SPEC.md            # Feature specification
├── public/
│   ├── index.html     # Main HTML entry
│   ├── styles.css     # Styles
│   ├── app.ts         # Frontend TypeScript
│   └── app.js         # Compiled JS (generated)
```

---

## Code Style Guidelines

### General Principles

- **No unnecessary comments** - Code should be self-explanatory
- **Keep functions small** - Single responsibility
- **Use TypeScript** - Always prefer .ts over .js for new code
- **Strict mode** - TypeScript strict mode is enabled

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `app.ts`, `rehearsal-list.ts` |
| Interfaces | PascalCase | `Rehearsal`, `DateOption` |
| Functions | camelCase | `loadRehearsals()`, `formatDateTime()` |
| Variables | camelCase | `currentUser`, `isAdmin` |
| Constants | UPPER_SNAKE_CASE | `API_BASE`, `PORT` |
| CSS Classes | kebab-case | `.rehearsal-card`, `.modal-content` |

### TypeScript Guidelines

#### Type Annotations
- Always use explicit return types for functions:
  ```typescript
  function getMaxVotes(rehearsal: Rehearsal): number { ... }
  ```
- Use interfaces for data structures (not bare objects)
- Prefer `type` over `interface` for unions/aliases

#### Strict Null Checking
```typescript
// Good - handles null explicitly
function hideModal(): void {
  const modal = $('#modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Avoid - unnecessary optional chaining on known elements
// const modal = $('#modal')!;  // Don't do this
```

#### Type Casting
When DOM elements need specific types:
```typescript
const input = $('#userNameInput') as HTMLInputElement;
```

### JavaScript/Node Guidelines

#### Backend (server.js)
- Uses CommonJS (`require`/`module.exports`)
- Async functions return Promises
- Always handle errors with try/catch
- Use proper HTTP status codes (200, 201, 404, 500)

#### Error Handling
```typescript
// Frontend - always handle API errors
async function loadRehearsals(): Promise<void> {
  try {
    const res = await fetch(API_BASE);
    rehearsals = await res.json();
    renderRehearsals();
  } catch (err) {
    console.error('Failed to load rehearsals:', err);
  }
}

// Backend - return proper error responses
function getRehearsal(req, res) {
  const rehearsal = data.rehearsals.find(r => r.id === req.params.id);
  if (!rehearsal) {
    return res.status(404).json({ error: 'Rehearsal not found' });
  }
  res.json(rehearsal);
}
```

### HTML/CSS Guidelines

#### HTML
- Use semantic HTML elements
- Prefer data attributes for JavaScript hooks: `data-id="${r.id}"`
- Always escape user-generated content

#### CSS
- Use CSS custom properties (variables) for colors
- Follow the defined color palette:
  - `--primary: #ff6b35`
  - `--secondary: #4ecdc4`
  - `--surface: #1a1a1a`
- Use flexbox/grid for layout
- Mobile-first responsive design

### Import Guidelines

#### Frontend (no build step for imports)
- Single JavaScript file, no imports needed
- If adding modules, use ES modules with `<script type="module">`

#### Backend
- Use CommonJS require syntax:
  ```javascript
  const express = require('express');
  const cors = require('cors');
  const { v4: uuidv4 } = require('uuid');
  ```

### API Design

- RESTful endpoints under `/api/`
- JSON request/response bodies
- Proper HTTP methods:
  - `GET` - retrieve data
  - `POST` - create new resources
  - `PUT` - update existing
  - `DELETE` - remove resources

---

## Common Tasks

### Adding a New API Endpoint

1. Add route in `server.js`:
   ```javascript
   app.get('/api/endpoint', handlerFunction);
   ```

2. Create handler function (place before routes):
   ```javascript
   function handlerFunction(req, res) {
     // Implementation
   }
   ```

3. Return proper JSON response or error

### Adding a New Frontend Feature

1. Write TypeScript in `public/app.ts`
2. Rebuild: `npm run build`
3. Test in browser at http://localhost:3001

### Modifying Data Models

If you change interfaces in `app.ts`, ensure:
- Backend sends matching JSON structure
- Render functions handle new/optional fields gracefully

---

## Debugging Tips

- Server runs on **port 3001** (not 3000)
- Check browser console for frontend errors
- Check terminal for server errors
- `data.json` contains all persisted data
- Use `curl` to test API: `curl http://localhost:3001/api/rehearsals`

---

## Notes for AI Agents

- Always run `npm run build` after editing `.ts` files
- The server must be restarted if server.js changes
- Frontend changes are auto-served on refresh (no restart needed)
- No linter is configured - follow these guidelines manually
