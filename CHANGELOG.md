# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [1.0.1] - 2026-09-11

### ✨ Added

- **Smart Event Argument Parsing**: 
    **`@event`** now **accepts additional arguments** directly from the pattern — e.g., `@input="updateField(e, 'lastName')"`.

    Before:
    ```html
    <input @input="updateFirstName" />
    <input @input="updateLastName" />
    <input @input="updateEmail" />
    ```
- **Typed Event Callbacks**: Improved compatibility for async handlers and typed callback signatures, including `Event`-based parameters in `ProgramCallback`.

### ⚡ Performance

- **Bundle Size**: Increased slightly from 2.8 kB to 2.9 kB minified + gzipped due to the enhanced event parsing logic, while remaining ultra-lightweight.

## [1.0.0] - 2026-09-10

### 🎉 Initial Stable Release

The first official, production-ready release of HTMP (htm-projection). It is a lightweight, zero-dependency UI renderer powered entirely by native Web APIs such as `Proxy` and `DOMParser`.

### ✨ Added

- **Slot-Based Rendering Engine**: Replaces the virtual DOM with an O(1) registry map that records relative DOM paths for surgical updates.
- **Deep Reactivity**: State is wrapped in native `Proxy`, supporting both primitive values and nested object/array mutations.
- **Template Syntax**:
  - `{{ expression }}` for text interpolation and logical evaluation.
  - `:attr="expression"` for attribute binding, such as `:class`, `:value`, and `:disabled`.
  - `@event="handler"` for native event listener binding.
  - `:for="item in items"` for list rendering with automatic ID/index key mapping.
- **Component Lifecycle Methods**: `mount`, `unmount`, `remount`, and `destroy`.
- **Lifecycle Hooks**: `onMount`, `onUnmount`, `onRemount`, and `onDestroy`.
- **API Initializers**: `setProxy()` and `setProgram()` support both key-value and object-literal inputs.
- **TypeScript Generics**: Full type-safety for state interfaces via `new HTMP<MyState>()`.
- **Developer Experience Warnings**: Warns when a reactive variable is used in a template but is not registered through `setProxy()`.

### 🐛 Fixed

- **In-Place DOM Patching**: Fixed cursor jumping and focus loss in `<input>`, `<textarea>`, and `<select>` during rapid reactive updates.
- **Boolean Attribute Handling**: Fixed `:disabled="false"` still locking elements by properly removing attributes when values evaluate to `false`.
- **Regex String Injection Protection**: Fixed string literals inside attributes, such as `'card-'+item.status`, from being corrupted by variable replacement logic.
- **Stale Closure in Loops**: Fixed event listeners inside `:for` loops referencing outdated item data after an array update.
- **Deep Proxy Get Trap**: Fixed untracked nested property mutations, such as `proxy.items[0].label = 'X'`, so they now trigger re-renders correctly.
- **Universal Scope Evaluator**: Fixed `ReferenceError` when accessing root proxy variables, such as `editForm.title`, inside a `:for` loop.

### ⚡ Performance

- **Bundle Size**: 2.8 kB minified + gzipped.
- **Dependencies**: Zero external dependencies; no build step is required for CDN usage.
