# Frontend Guidelines

## Component Structure
- Use function components with hooks
- Main exported function/component should always be the top function unless there are hoisting issues
- Early returns for conditional rendering
- Sub-components defined in same file after main component
- Default export when a file has one main function (components, hooks, utilities); named exports when it has several

## Rendering Logic
- Extract logic from components into separate if-else conditions
- Extract map loops to variables outside JSX
- For conditional rendering, use if-else conditions outside JSX to build arrays/variables, not ternary operators or logical AND inside JSX
- Ternary operators in JSX are only acceptable for simple inline styles or class names

```javascript
// Bad: logic mixed in JSX
return (
  <div>
    {isProcessing ? 'Processing...' : 'Start'}
    {message && <div>{message}</div>}
  </div>
);

// Good: logic extracted before JSX
const buttonText = isProcessing ? 'Processing...' : 'Start';

let messageElement = null;
if (message) {
  messageElement = <div>{message}</div>;
}

return (
  <div>
    {buttonText}
    {messageElement}
  </div>
);
```

## State & API
- Descriptive state names, local state with `useState`, functional updates for dependent state
- Centralized `ApiClient` with specific named methods, async/await pattern

## Naming
- Use `is` prefix for boolean props (`isActive`, `isLoading`)
- Use `has`, `can`, `should` prefixes for other boolean checks

## Function Declarations
- Use `function` keyword for event handlers, utility functions, and render functions
- Use arrow functions only for inline callbacks in JSX

```javascript
// Preferred: function declarations
function handleSaveClick() { ... }
function renderItems() { ... }

// Acceptable: arrow functions for inline callbacks
onClick={() => handleSaveClick()}
items.map(item => ...)
```

## Boolean Type Checking
- For values that are genuinely booleans, test them directly, no `=== true` / `!== true`
- For values that may be `undefined`, `null`, `0`, or `""`, compare explicitly so the intent is visible and a falsy-but-valid value isn't silently treated as absent

```javascript
// Preferred: real booleans tested directly
if (isEnabled) { ... }
if (!isEnabled) { ... }
if (response.ok) { ... }

// Preferred: explicit checks when the value isn't a boolean
if (count === 0) { ... }
if (name === undefined) { ... }
if (items.length > 0) { ... }

// Avoid: truthy checks that hide a non-boolean
if (count) { ... }
if (name) { ... }
```

## Event Handling
- Handler naming: `handle{Action}Click` or `handle{Action}`
- Keyboard shortcuts with `preventDefault()`

## Modal Patterns
- Build modals from the components in `commons/components/Modal.jsx`: `ModalBackdrop`, `ModalContainer`, `ModalHeader`, `ModalContent`, `ModalFooter`
- `ModalBackdrop` renders into `document.body` with `createPortal` and closes on backdrop click via `classList.contains("modal-backdrop-container")`
