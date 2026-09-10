# HTMP API Reference

HTMP is a lightweight HTML projection library for building reactive UI from template strings with declarative bindings.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Constructor](#constructor)
- [State Management](#state-management)
- [Template Syntax](#template-syntax)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Execution Controls](#execution-controls)

## Overview

HTMP parses a template, tracks reactive dependencies, and updates only the affected DOM nodes when state changes.

Core features:

- reactive proxy-backed state
- text interpolation with `{{ ... }}`
- attribute binding with `:`
- event binding with `@`
- list rendering with `:for`
- lifecycle callbacks
- TypeScript-friendly generic API

## Installation

```bash
npm install htm-projection
```

```ts
import HTMP from 'htm-projection';
```
### Via CDN (Browser):

```js
<script src="https://unpkg.com/htm-projection/dist/htmp.umd.js"></script>
```

## Quick Start

```html
<div id="app"></div>

<script type="module">
import { HTMP } from 'htm-projection';

// P1 PATTERN, first pillar
const pattern = `
  <div>
    <h1>{{ title }}</h1>
    <button @click="increment">Count: {{ count }}</button>
  </div>
`;

const app = new HTMP('app', pattern);

// P2 PROXY
app.setProxy({
  title: 'Hello HTMP',
  count: 0
});

// P3 PROGRAM
app.setProgram({
  increment: () => { app.proxy.count++; },
});

app.mount();
</script>
```

## Constructor

```ts
new HTMP<T>(rootId: string, templateString: string)
```

Creates a new HTMP instance, parses the template, and builds the internal registry used for reactive updates.

### Parameters

- `rootId: string` — ID of the DOM element used as the mount container.
- `templateString: string` — HTML markup containing HTMP bindings.

### TypeScript Support (Generics)

For full Type-Safety and IDE auto-completion, you can pass a TypeScript interface to the class.

```ts
import { HTMP } from 'htm-projection';

interface AppState {
  title: string;
  count: number;
  todos: Array<{ id: number, text: string, done: boolean }>;
}

// Initialize with Type
const app = new HTMP<AppState>('root', templateString);
```
Parameters:

`rootId (String)`: The ID of the HTML element that will act as the mounting container.

`templateString (String)`: A raw HTML string containing htmp binding syntax ({{ }}, :, @).

## State Management

HTMP uses a root Proxy to intercept state mutations and trigger targeted DOM updates.

### `setProxy(stateObject)`

Registers initial state values. It accepts either a single key/value pair or an object literal.

```ts
// single key
app.setProxy('title','My title');

// with object (recomended)
app.setProxy({
  title: 'Todo App',
  todos: [],
  isLoading: false
});
```

### Direct State Manipulation

Reactive updates happen when you mutate values through `app.proxy`.

```ts
app.proxy.title = 'New Title';
app.proxy.todos = [...app.proxy.todos, { id: 1, text: 'New Task', done: false }];
app.proxy.todos[0].done = true;
```

### `setProgram(methodsObject)`

Registers methods that can be used from event bindings in the template.

```ts
app.setProgram({
  handleInput: (e: Event) => {
    app.proxy.title = (e.target as HTMLInputElement).value;
  },
  addTodo: () => {
    // Add todo logic
  },
  toggleTodo: (todoItem: any) => {
    // Toggle logic
  }
});
```

You can also register a single method by name:

```ts
app.setProgram('saveUser', () => {
  app.proxy.user.name = 'Bob';
});
```

## Template Syntax

HTMP uses plain HTML plus a small set of binding directives.

### Text Interpolation

Use `{{ ... }}` to bind values or expressions to text nodes.

```html
<h1>{{ title }}</h1>
<p>{{ todos.length === 0 ? 'No tasks found' : 'Tasks available' }}</p>
```

### Attribute Binding

Bind state values or expressions to HTML attributes. htmp intelligently handles boolean attributes and form values.

```html
<!-- Boolean Attribute -->
<button :disabled="isLocked">Save</button>

<!-- Class Binding -->
<div :class="isActive ? 'btn-primary' : 'btn-secondary'">Content</div>

<!-- Form Input (Use :value, NOT {{ }} inside tags) -->
<input type="text" :value="form.title" @input="updateTitle(e)" />

<!-- Select Dropdown -->
<select :value="form.role">
  <option value="admin">Admin</option>
  <option value="user">User</option>
</select>
```

Behavior:

- `false` removes the attribute
- `true` sets an empty attribute
- for form elements like `input`, `textarea`, and `select`, `:value` updates the DOM property directly to avoid cursor jumping

### Event Binding

Use `@` to bind DOM events to registered program handlers.

```html
<!-- Without arguments (passes Event object by default) -->
<button @click="addTodo">Add</button>

<!-- With explicit Event object -->
<input @input="handleInput(e)" />

<!-- With parameters from a loop -->
<button @click="toggleTodo(todo)">Complete</button>

<!-- Without parameters (empty parentheses) -->
<button @click="closeModal()">Close</button>
```

### List Rendering

Render arrays using the :for directive. htmp automatically uses the item's id property as the DOM key for efficient reconciliation. If no id exists, it falls back to the array index.

DOM elements are patched in-place, meaning focus and scroll states are preserved during updates.

```html
<ul>
  <li :for="todo in todos">
    <span>{{ todo.text }}</span>
    <button @click="removeTodo(todo)">Delete</button>
  </li>
</ul>
```

### Conditional Rendering (No `:if` needed)

HTMP intentionally omits an `:if` directive to preserve DOM stability. Instead of destroying and recreating elements, use native JavaScript ternary operators inside `{{ }}` to render content dynamically.

> [!IMPORTANT]
> You can still show an empty-state message — but only when it improves the user experience, not because the framework requires it.

```html
<!-- If the list is empty, show a message. Otherwise, render nothing. -->
<p>{{ todos.length === 0 ? 'No todos yet!' : '' }}</p>

<!-- Another option is to show the total count once data is available. -->
<p>{{ todos.length === 0 ? 'No todos yet!' : 'Total: ' + todos.length }}</p>

<!-- Toggle classes without v-if -->
<div :class="isActive ? 'active' : 'hidden'">Content</div>
```

## Lifecycle Hooks

### `onMount(callback)`

Runs after the component is inserted into the DOM.

```ts
app.onMount(() => {
  console.log('Component mounted');
});
```

### `onUnmount(callback)`

Runs when the component is removed from the DOM, while its state remains in memory.

```ts
app.onUnmount(() => {
  console.log('Component hidden');
});
```

### `onRemount(callback)`

Runs when the component is reattached to the DOM.

```ts
app.onRemount(() => {
  console.log('Component remounted');
});
```

### `onDestroy(callback)`

Runs when the component is permanently destroyed and cleared from memory.

```ts
app.onDestroy(() => {
  console.log('Component destroyed');
});
```

## Execution Controls

### `mount(targetId?)`

Mounts the component into the DOM. Optionally overrides the constructor root ID.

```ts
app.mount();              // Mounts to original rootId
app.mount('new-root-id'); // Mounts to a different container
```

### `unmount()`

Removes the component from the DOM without clearing its internal state.

```ts
app.unmount();
```

### `remount(targetId?)`

Reattaches an unmounted instance.

```ts
app.remount();              // Remounts to original rootId
app.remount('new-root-id'); // Remounts to a different container
```

### `destroy()`

Deletes the component from the DOM, clears registries, removes listeners, and releases memory.

```ts
app.destroy();
```

## Notes

- State should generally be modified through `app.proxy` to ensure reactive updates fire.
- Nested object values are deeply reactive.
- List items are reconciled by DOM identity and array order.
- Use typed generics for stronger editor support and safer state handling.

 