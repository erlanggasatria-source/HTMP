# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [1.0.2] - 2026-09-16

### ✨ Added

- **`:for` now works on `<tr>` elements inside `<table>`.**
  Browser's strict HTML parsing would strip `<tr>` when parsed outside
  table context. HTMP now wraps HTML in a native `<template>` element
  during compilation, which parses content as an HTML fragment without
  context restrictions.

  ```html
  <table>
    <tbody>
      <tr :for="user in users">
        <td>{{ user.name }}</td>
        <td>{{ user.email }}</td>
      </tr>
    </tbody>
  </table>
  ```

- Tested with `examples/admin-lte/users.html`: reactive table with search,
  role filter, status badge, and action buttons.

- **Auto self-healing registry paths.**
  When external scripts manipulate the DOM inside an HTMP root, the
  registry path (for example, `[5, 0, 0]`) may become stale. HTMP now
  detects this and automatically corrects the path using node IDs
  (`node._htmp`). After healing, updates return to surgical path-based mode.

  Example diagnostic:

  ```text
  [HTMP] Self-healing: Path corrected for ID 5
  ```

  This removes the need for manual `remount()` in most recovery scenarios.

### 🔄 Changed

- Removed the DOM manipulation warning from the README. With self-healing
  in place, HTMP can recover from many external DOM changes automatically.

### ⚡ Performance

- Bundle size increased by approximately 0.4 kB gzipped, from 2.9 kB to
  3.3 kB, to support table parsing and DOM resilience.
- Healing only runs when the stored path fails. After recovery, updates
  return to the normal surgical path-based flow.

### Why This Matters

- Table support makes HTMP suitable for AdminLTE, SB Admin, and other
  Bootstrap-based admin templates.
- Self-healing makes HTMP more resilient in legacy environments such as
  jQuery applications, WordPress, and browser extensions.
- State remains the source of truth while the DOM stays disposable and
  recoverable.

    Self-healing — makes HTMP resilient in legacy environments
    (jQuery, WordPress, browser extensions). State remains the source
    of truth. DOM is disposable — and now, self-repairing.

## [1.0.1] - 2026-09-11

### ✨ Added

- **Smart Event Argument Parsing**: 
    **`@event`** now **accepts additional arguments** 
    - Example: `@input="updateField(e, 'lastName')"`
    - Before: `@input="updateFirstName"` → `@input="updateLastName"` → separate handlers.
    - After: one handler for many fields.
    - **Trade-off:** +0.1 kB gzip (2.8 → 2.9 kB).
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
