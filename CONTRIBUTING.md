# Contributing to HTMP

Thank you for your interest in contributing to HTMP! 🚀

HTMP is built around a simple philosophy: HTML + Proxy = reactivity. No framework. No build step. Just the browser.

To keep the project ultra-lightweight and grounded in native Web APIs, please follow these guidelines before submitting a pull request.

## 🧠 Core Philosophy: The 3 Pillars

Any feature or bug fix must respect the three pillars of HTMP:

- **Pattern (HTML)**: Templates must remain standard HTML. No custom template languages such as JSX or Svelte syntax. Use only `{{ }}`, `:`, and `@`.
- **Proxy (Reactivity)**: State management must rely on native JavaScript `Proxy`. No external state management libraries.
- **Program (Control)**: Logic must remain explicit. Avoid “magic” features such as watchers or computed properties in favor of direct state manipulation.

## 🛑 Strict Rules

- **Zero Dependencies**: Do not introduce npm dependencies into the core engine. Use native Web APIs such as `DOMParser`, `Proxy`, and `Node` where possible.
- **No Virtual DOM**: Do not introduce tree-diffing or virtual DOM logic. Updates should remain O(1) surgical DOM patches via the registry map.
- **Bundle Size Matters**: If a change significantly increases bundle size, it will be reviewed very carefully. We optimize for every byte.

## 🐛 Reporting Bugs

If you find a bug, please open an issue and include:

- A clear description of the problem.
- A minimal reproducible example in HTML/JavaScript.
- What you expected to happen versus what actually happened.

## 🛠️ Development Setup

1. Fork and clone the repository.
2. Run `npm install` to install development dependencies such as TypeScript and test tooling.
3. Run `npm run build` to compile the engine.
4. Validate the behavior in the browser by opening the files in the `/examples` folder directly.
5. Run the smoke test suite with `npm run test` to confirm the core rendering behavior still passes in a DOM environment.

### Recommended Validation Flow

- **Manual UI check**: Open `/examples/basic/index.html` and `/examples/note-with-polaris` to verify real user interactions.
- **Automated regression check**: Run `npm run test` and make sure the smoke tests in `tests/basic-smoke.test.js` pass without errors.

## 🔄 Pull Request Process

1. Ensure your code passes TypeScript checks with `tsc --noEmit`.
2. Update `README.md` or `API.md` if you are adding a new feature or changing public behavior.
3. Keep the code clean and well-commented, especially when interacting directly with the DOM.
4. Submit your pull request with a clear and descriptive title.

We look forward to building the future of native web reactivity together. ✨