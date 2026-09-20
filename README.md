# HTMP

    HyperText Mutation & Projection
    Not another reactive framework. Native browser runtime.

**Pattern. Proxy. Program.**
No JSX. No Babel. No Virtual DOM. No diffing

**Zero dependencies. Ready for widgets or SPA.**

    HTML + Proxy = Reactivity. No framework. No build step. Just the browser

HTMP is a lightweight, zero-dependency UI renderer. It brings fine-grained reactivity directly to static HTML without the need for a virtual DOM, compilers, or complex build steps.

---

## 🧠 How It Works

When developers hear "reactivity without a virtual DOM," they ask: **how does it diff the DOM?**

**It doesn't.** HTMP does not compare old and new trees. Instead, it uses a slot-based rendering architecture powered entirely by native Web APIs.

### 🔷 The 3 Pillars

```text
Pattern → Parser → Proxy → Program → Precision Projection
```

| Pillar | What It Does | Powered By |
| --- | --- | --- |
| Pattern | Your HTML blueprint — parsed once. | DOMParser |
| Proxy | Reactive state — changes trigger precise updates. | Proxy |
| Program | Your methods — event handlers, logic, side effects. | Plain JavaScript |

### Technical Flow

1. Template Parsing: The native DOMParser reads your HTML string into a real DOM tree in memory.
2. Registry Mapping: As HTMP traverses the DOM, it records the exact relative path (for example, root -> child[1] -> child[0]) of every `{{ }}`, `:attr`, and `:for` into a registry map.
3. Proxy Trap: When you mutate `proxy.title = 'New'`, the native Proxy intercepts the change.
4. Surgical Update: The Proxy checks the registry, jumps directly to the specific DOM node, and updates only its `nodeValue` or attribute.

**No virtual DOM. No diffing algorithms. Just direct, surgical DOM updates.**

---

## ✨ Core Advantages

- **Ultra-lightweight (~3.6 KB min zip):** zero dependencies. Drop it into any project via npm or a single `<script>` tag from a CDN.
- **Friendly guest (embeddable):** non-invasive. It does not demand ownership of the entire `<body>`. You can embed HTMP in a specific `div` inside WordPress, jQuery apps, or even inside React/Vue components without causing DOM mutation conflicts.
- **SPA ready:** equipped with complete lifecycle controls (`mount`, `unmount`, `remount`, `destroy`). Pair it with the native browser Navigation API to build a full single-page application without a heavy router library.
- **Slot-based rendering:** say goodbye to `if` conditionals used to prevent rendering errors. If data is `null` or `[]`, the slot simply remains empty. When data arrives, the Proxy fills the exact slot instantly. The template remains a pure, declarative projection of your state.
- **Unlimited nested `:for` (irregular trees):** render multi-level menus, organizational charts, or threaded comments at any depth — even when each branch has a different depth (imbalanced/irregular tree). No `if` conditionals needed: if a child array is `null` or `[]`, the nested loop simply renders nothing and the tree stays intact. The engine manages a Scope Chain so child loops can access variables from parent loops natively.

---

## 📦 Verified Bundle Size v1.1.0

[![BundlePhobia](https://badgen.net/bundlephobia/minzip/htm-projection)](https://bundlephobia.com/package/htm-projection)

| Metric | Value |
| :--- | :--- |
| Bundle Size (Minified) | **10.4 kB** |
| **Minified + Gzipped** | **3.6 kB** |
| Download (Slow 3G) | **72 ms** |
| Download (Emerging 4G) | **4 ms** |

> Verified independently by [BundlePhobia](https://bundlephobia.com/package/htm-projection).


---

## 📦 Installation

### Via npm

```bash
npm install htm-projection
```

### Via CDN (Browser)

```js
<script type="module" src="https://cdn.jsdelivr.net/npm/htm-projection@latest/+esm"></script>
```

Use HTMP directly in the browser — no build step, no npm install.

| CDN | ESM URL |
| :--- | :--- |
| **jsDelivr** | `https://cdn.jsdelivr.net/npm/htm-projection@latest/+esm` |
| **unpkg** | `https://unpkg.com/htm-projection@latest/dist/esm/index.js` |
| **esm.sh** | `https://esm.sh/htm-projection@latest` |

---

## ⚡ Quick Start

This example demonstrates **initialization with an empty array `[]`**, **reactive updates**, **conditional rendering without `if`**, and **list rendering**.

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: sans-serif; padding: 20px; }
        .done { text-decoration: line-through; color: gray; }
        button { cursor: pointer; margin: 2px; }
    </style>
</head>
<body>
    <button id="unmount-app" type="button" onclick="app.unmount()">Unmount App</button>
    <button id="remount-app" type="button" onclick="app.remount()">Remount App</button>
    <div id="app"></div>

    <script type="module">
        import { HTMP } from 'https://cdn.jsdelivr.net/npm/htm-projection@latest/+esm';
                
        const pattern = /*html*/`
            <div>
                <h1>{{ title }}</h1>
                <input type="text" @input="changeTitle(e)" placeholder="Type title..." />
                
                <p>Count: {{ count }}</p>
                <button @click="increment()">Increment</button>
                
                <hr>

                <!-- If array is empty, this evaluates to a message. No v-if needed! -->
                <p><i>{{ todos.length === 0 ? 'No todos yet. Add one below!' : '' }}</i></p>
                <input type="text" id="todo-input" @input="changeInput(e)" :value="inputTodo" placeholder="New task..." />
                <button @click="addTodo()">Add Todo</button>
                
                <ul>
                    <li :for="todo in todos">
                        <span :class="todo.done ? 'done' : ''">{{ todo.text }}</span>
                        <button @click="finishTodo(todo)">{{todo.done? 'Undo' : 'Finish'}}</button>
                        <button @click="deleteTodo(todo)">Delete</button>
                    </li>
                </ul>                
            </div>
        `;

        // 1. Initialize
        const app = new HTMP('app', pattern);

        // 2. Set Initial State
        app.setProxy({
            title: "",            
            count: 0,
            inputTodo: '',
            todos: [] // Empty array is perfectly safe
        });

        // 3. Set Methods
        app.setProgram({
            changeTitle: (e) => { app.proxy.title = e.target.value; },
            increment: () => { app.proxy.count++; },
            changeInput: (e) => { app.proxy.inputTodo = e.target.value; },
            
            addTodo: () => {
                console.log(app.proxy.inputTodo);
                if (!app.proxy.inputTodo.trim()) return;
                app.proxy.todos = [...app.proxy.todos, { id: Date.now(), text: app.proxy.inputTodo, done: false }];
                app.proxy.inputTodo = '';
            },
            
            finishTodo: (todo) => {
                const updated = app.proxy.todos.map(t => t.id === todo.id ? { ...t, done: !t.done } : t);
                app.proxy.todos = updated;
            },
            
            deleteTodo: (todo) => {
                app.proxy.todos = app.proxy.todos.filter(t => t.id !== todo.id);
            }
        });

        // 4. Mount to DOM
        app.mount();
        
        window.app = app; // export to window now button access app.unmout() and app.remount()
    </script>
</body>
</html>
```

> 💡 Try it: Copy this example, save it as `test.html`, and open it directly in your browser. The reactivity works instantly without a virtual server or build environment — just plain HTML and the browser runtime.

---

### 💡 IDE Support (VS Code Tips)

By default, writing HTML inside JavaScript template literals (backticks) lacks syntax highlighting and auto-completion. To get a premium Developer Experience (DX) while writing HTMP patterns in VS Code:

    Install the es6-string-html extension.
    Add /* html */ right before your template string.

This unlocks full HTML syntax highlighting, tag matching, and auto-completion directly inside your HTMP pattern:

const pattern = /* html */ `  <div class="app-container">    <h1>{{ title }}</h1>    <button @click="increment()">Increment</button>    <ul>      <li :for="todo in todos">{{ todo.text }}</li>    </ul>  </div>`;

Now your IDE knows exactly how to validate and colorize your HTMP templates!

---
## Example

### 1. HTMP Basic Example

Live demo: <https://polaris-runtime.my.id/htmp-basic-example>

    Runs directly from file:// — no server, no build step, no npm install.

A single index.html demonstrating:

- Slot-based rendering — empty title and empty todo list, no if conditional needed.

- Reactive updates — title updates instantly as you type.

- List rendering — todos appear with working action buttons.

- No framework — plain HTML + one `<script>` tag.

```js
  app.setProxy({
            title: "",
            count: 0,
            todos: [] // Empty array is perfectly safe
        });
```

What to notice: The title starts empty. The todo list starts empty. No if, no else, no conditional rendering — the pattern is always there, and state fills the slots.

You can also mount and unmount the app dynamically for SPA-style behavior:

```html
<div style="display: flex; gap: 12px; margin-bottom: 16px;">
  <button id="unmount-app" type="button">Unmount App</button>
  <button id="remount-app" type="button">Remount App</button>
</div>
<div id="app"></div>

<script type="module">
  import { HTMP } from 'https://cdn.jsdelivr.net/npm/htm-projection@latest/+esm';

  const app = new HTMP('app', `
    <div>
      <h2>{{ title }}</h2>
      <input @input="changeTitle(e)" placeholder="Type title..." />
    </div>
  `);

  app.setProxy({ title: 'Hello HTMP' });
  app.setProgram({
    changeTitle: (e) => {
      app.proxy.title = e.target.value;
    }
  });

  app.mount();

  document.getElementById('unmount-app').addEventListener('click', () => {
    app.unmount();
  });

  document.getElementById('remount-app').addEventListener('click', () => {
    app.remount();
  });
</script>
```

This is useful for modal-style UI, hidden panels, or temporary sections where you want to keep the current state while temporarily removing and restoring the view.

### 2. HTMP Multi-Step Form Example

Live demo: <https://polaris-runtime.my.id/htmp-multi-step-form>

This example lives in `examples/multi step form/index.html` and demonstrates a three-step wizard form with shared state, dynamic step visibility, and event-driven field updates.

A few things it highlights:

- `currentStep` drives the visible form section without any manual DOM branching.
- `formData` is stored in a single reactive object and updated through one generic field handler.
- Previous/Next navigation is handled through simple program methods while keeping the template declarative.

```html
<div class="step" :style="currentStep === 1 ? 'display: block' : 'display: none'">
  <h3>Create Account</h3>
  <input :value="formData.email" @input="updateField(e, 'email')" />
</div>
```

### 3. HTMP SPA Ticket Demo

Live demo: <https://polaris-runtime.my.id/htmp-spa-ticket>

This example lives in `examples/spa-ticket/index.html` and demonstrates a simple SPA flow using the browser History API. It includes a ticket list and route-based detail view for each ticket, with mock data and a fallback message when a requested ticket does not exist.

A few things it highlights:

- `history.pushState()` keeps the page feeling like a real SPA without a framework router.
- route handling can switch between list and detail views without reloading the page.
- `unmount()`/`remount()` remain useful for temporary views and modal-like UI patterns.
- the example is ideal for static hosting, local server usage, or a simple client-side dashboard prototype.

```html
<a href="/ticket/1" @click="openTicket(ticket, e)">Ticket #1</a>
```

> For production-style SPA routing, it is best served through a local HTTP server or hosting environment that supports URL rewriting.

### 4. HTMP Nested Loop (Unlimited Depth)

Live demo: <https://polaris-runtime.my.id/htmp-nested-loop/>

Source: `examples/htmp-nested-loop/index.html`

This example demonstrates unlimited nested `:for` rendering an organizational chart with irregular tree depth — some branches are 4 levels deep, others are 2. Same pattern. No key. No `<template>` wrapper. No `if` conditional.

A few things it highlights:

- **4-level nested loop** — Chairperson → Vice Chairperson → Division → Member.
- **Irregular tree support** — branches with different depths render correctly with a single pattern.
- **Click handler on every level** — each node has `@click` that works across all scopes.
- **Slot-based rendering** — if a branch has no children (`[]` or `undefined`), the nested loop simply renders nothing and the tree stays intact.
- **Scope Chain** — child loops access parent variables natively (`child.children`, `sub.children`).

Why this is different:

| | React | Vue | Alpine | HTMP |
|---|---|---|---|---|
| Nested loop | `map` + key | `v-for` + `:key` | `x-for` + `:key` | `:for` |
| Template wrapper | — | `<template>` | `<template>` | — |
| Conditional (if) | Required | Required | Required | Not needed |
| Irregular tree | Manual check | Manual check | Manual check | Native |
| Unlimited depth | Manual | Manual | Limited | Yes |

Works from `file://`. No server. No build. No npm install.

### 5. HTMP Note APP

Live demo: <https://polaris-runtime.my.id/htmp-note>

HTMP as presentation layer of TypeScript project,

```bash
cd examples/note-with-polaris
npm install
npm run dev
```

### 6. AdminLTE User Directory Example

Source: [examples/admin-lte/users.html](examples/admin-lte/users.html)

This example starts with an original AdminLTE 4 page and turns the User Directory card into one HTMP projection. The surrounding AdminLTE layout, modal markup, navigation, and Bootstrap behavior remain ordinary HTML.

It demonstrates:

- user rows rendered with `:for="user in pagedUsers"`;
- reactive search and role filtering;
- role and status badge classes resolved by proxy helpers;
- page-size selection with `10`, `50`, and `100` options;
- pagination derived from the filtered data;
- edit and delete actions receiving the current user object;
- a chained update flow without jQuery DOM manipulation.

```text
search / role filter
        -> filteredUsers
        -> pageCount and pages
        -> pagedUsers
        -> table rows and pagination
```

The complete card is mounted once:

```js
const userTable = new HTMP('users-card-content', userCardPattern);

userTable.setProxy({
  users,
  filteredUsers: users,
  pagedUsers: users.slice(0, 10),
  page: 1,
  pageSize: 10
});

userTable.mount();
```

---

## 🤝 Total Control State Management (No Magic Global Stores)

HTMP does not force you into a complex global state management pattern such as Redux or Pinia. Because each projection is isolated, you can manage **cross-component state** with simple **vanilla JavaScript arrays** and **lifecycle hooks**:

```javascript
 
const activeProjections = [];

const appProjection = new HTMP('app', appTemplate);

// Register on mount, cleanup on destroy
appProjection.onMount(() => activeProjections.push(appProjection));
appProjection.onDestroy(() => {
    const index = activeProjections.indexOf(appProjection);
    if (index > -1) activeProjections.splice(index, 1);
});

// Total control: update all active projections at once
function setLoading(isLoading) {
    activeProjections.forEach(p => {
        if (p.isMounted) p.proxy.loading = isLoading;
    });
}
```

---

## 📖 API Reference

For a complete list of methods, lifecycle hooks, and template syntax, please read the full [API](https://github.com/erlanggasatria-source/HTMP/blob/main/API.md) documentation.

## 🛡️ Self-Healing DOM v1.0.2+

HTMP manages its DOM surgically via a Registry Map — but if external scripts
(jQuery, browser extensions, legacy code) manipulate the DOM inside an HTMP
root, HTMP now **heals itself automatically**.

### How it works

- Every binding node is tagged with `_htmp` (its binding ID).
- If a path becomes stale, HTMP finds the node by ID and corrects the path.
- After healing, updates return to surgical mode.

### What this means

- **No more manual `remount()`** in most cases.
- **Safe in legacy environments** — jQuery, WordPress, browser extensions.
- **State remains the source of truth.** DOM is disposable — and now,
  self-repairing.

[HTMP] Self-healing: Path corrected for ID 5
text


> HTMP works *with* the browser, not against it. Self-healing is just
> another example of using what the platform already provides.

---


### Possibilities

**The HTMP advantage across these use cases:**

| Use Case | Without HTMP | With HTMP |
| --- | --- | --- |
| Legacy HTML | Rewrite in React | Attach projection and keep HTML |
| PHP Blade | Add React hydration (slow) | Lightweight HTMP overlay |
| WordPress | Heavy plugin, jQuery mess | Tiny HTMP widget |
| SPA | Framework forced | HTMP chosen |
| MPA + SEO | Tradeoff: SPA vs SSR | Both: static HTML + hydration |

#### 1. Legacy HTML + Reactive Widget

```html
<!-- existing-page.html (static, SEO-friendly) -->
<html>
  <head><title>Meeting List</title></head>
  <body>
    <h1>Meetings</h1>
    
    <!-- Attach reactivity here -->
    <div id="meeting-list"></div>
    
    <script src="htmp.js"></script>
    <script src="meeting-widget.js"></script>
  </body>
</html>
```

```typescript
// meeting-widget.js

const projection = new HTMP('meeting-list', `
  <ul>
    <li :for="meeting in meetings">
      {{ meeting.title }} - {{ meeting.status }}
      <button @click="openMeeting(meeting.id)">Open</button>
    </li>
  </ul>
  <button @click="refreshList()">Refresh</button>
`);

projection.setProxy({
  meetings: await fetchMeetings()
});

projection.setProgram({
  openMeeting: (id) => window.location = `/meeting/${id}`,
  refreshList: () => projection.proxy.meetings = await fetchMeetings()
});

projection.mount();
```

#### 2. PHP Blade (Server-Rendered + Hydrated)

```php
<!-- resources/views/meeting-admin.blade.php -->
<div class="admin-panel">
  <h2>{{ $workspace->name }} Admin</h2>
  
  <!-- Server render initial data -->
  <div id="admin-dashboard" 
       data-role="{{ $user->role }}"
       data-workspace="{{ $workspace->id }}">
    <!-- Placeholder, will hydrate -->
  </div>
</div>
```

@vite('resources/js/admin-dashboard.ts')

```typescript
// resources/js/admin-dashboard.js

const adminDash = new HTMP('admin-dashboard', `
  <div :show="role === 'admin'">
    <button @click="approveAllNotes()">Approve All</button>
    <div :for="note in pendingNotes">
      {{ note.title }}
      <button @click="approveNote(note.id)">✓</button>
    </div>
  </div>
  
  <div :show="role === 'supervisor'">
    <p>View only mode</p>
  </div>
`);

const el = document.getElementById('admin-dashboard')!;
adminDash.setProxy({
  role: el.dataset.role || 'viewer',
  workspaceId: el.dataset.workspace,
  pendingNotes: []
});

adminDash.setProgram({
  approveAllNotes: async () => {
    await api.batch.approve(adminDash.proxy.pendingNotes);
    adminDash.proxy.pendingNotes = [];
  },
  approveNote: async (id) => {
    await api.note.approve(id);
    adminDash.proxy.pendingNotes = 
      adminDash.proxy.pendingNotes.filter(n => n.id !== id);
  }
});

adminDash.mount();
```

#### 3. WordPress Plugin (Metabox Widget)

```php
// plugin: polaris-meeting/meeting-widget.php
add_meta_box(
  'meeting_approvals',
  'Meeting Approvals',
  function($post) {
    echo '<div id="meeting-approvals"></div>';
    wp_enqueue_script('htmp', '/htmp.min.js');
    wp_enqueue_script('meeting-widget', '/meeting-widget.js', ['htmp']);
  },
  'post',
  'advanced'
);
```

```typescript
// meeting-widget.ts
const approvals = new HTMP('meeting-approvals', `
  <div class="htmp-widget">
    <h3>Pending Approvals</h3>
    <div :for="meeting in pendingMeetings">
      <strong>{{ meeting.title }}</strong><br/>
      Status: <span :style="meetingStatusStyle(meeting.status)">
        {{ meeting.status }}
      </span>
      <button @click="approveMeeting(meeting.id)">Approve</button>
      <button @click="rejectMeeting(meeting.id)">Reject</button>
    </div>
    <div>
      {{ pendingMeetings.length === 0 ? 'No pending approvals' : '' }}
    </div>
  </div>
`);

approvals.setProxy({
  pendingMeetings: window.POLARIS_MEETINGS || []
});

approvals.setProgram({
  approveMeeting: (id) => {
    // Send to WordPress AJAX endpoint
    jQuery.post(ajaxurl, {
      action: 'approve_meeting',
      meeting_id: id
    }, () => {
      approvals.proxy.pendingMeetings = 
        approvals.proxy.pendingMeetings.filter(m => m.id !== id);
    });
  }
});

approvals.mount();
```

### SPA Patterns

```text
Pattern A: SPA (Single-Page App)
┌─────────────────────────────────┐
│ main.ts — Router/Orchestration  │
├─────────────────────────────────┤
│ <router.navigate('admin')>      │
│   ↓ unmount current projection  │
│   ↓ load admin projection       │
│   ↓ mount ke root-id            │
│                                 │
│ <div id="app-root"></div>       │
└─────────────────────────────────┘

Pattern B: MPA (Multi-Page App)
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ pages/admin/ │  │ pages/user/  │  │ pages/notes/ │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ admin.html   │  │ user.html    │  │ notes.html   │
│ admin.ts     │  │ user.ts      │  │ notes.ts     │
│ (projection) │  │(projection)  │  │(projection)  │
└──────────────┘  └──────────────┘  └──────────────┘
     ↓                  ↓                  ↓
  build → admin.html  build → user.html  build → notes.html
        + admin.js          + user.js          + notes.js
```

#### File Structure: Pattern A (SPA)

```text
src/
├── main.ts                    ← Router/orchestrator
├── projections/
│   ├── meeting.ts             ← Shared projection
│   ├── admin-panel/
│   │   ├── admin.ts           ← Projection instance
│   │   └── admin.html         ← Template
│   ├── user-panel/
│   │   ├── user.ts
│   │   └── user.html
│   └── notes/
│       ├── notes.ts
│       └── notes.html
└── index.html                 ← Single entry (id="app-root")
```

```typescript
// main.ts — SPA orchestrator
import { AdminProjection } from './projections/admin-panel/admin';
import { UserProjection } from './projections/user-panel/user';

const router = {
  navigate: async (route: string) => {
    // Unmount current
    currentProjection?.unmount();
    
    // Load & mount new projection
    if (route === 'admin') {
      currentProjection = new AdminProjection();
      currentProjection.mount('app-root');
    } else if (route === 'user') {
      currentProjection = new UserProjection();
      currentProjection.mount('app-root');
    }
  }
};

router.navigate('user'); // Start
```

#### File Structure: Pattern B (MPA - Svelte-like)

```text
pages/
├── admin/
│   ├── index.ts               ← Entry point
│   ├── index.html             ← Template (id="app")
│   └── admin-projection.ts    ← Projection
├── user/
│   ├── index.ts
│   ├── index.html
│   └── user-projection.ts
└── notes/
    ├── index.ts
    ├── index.html
    └── notes-projection.ts
```

```typescript
// pages/admin/index.ts
import { AdminProjection } from './admin-projection';

const admin = new AdminProjection();
admin.mount('app');

// pages/user/index.ts
import { UserProjection } from './user-projection';

const user = new UserProjection();
user.mount('app');

// Bundler config (Vite/rollup) output multiple HTML + JS pairs
// Deployment: /admin.html, /user.html, /notes.html
// Navigation: window.location = '/admin.html' (hard navigation)
```

#### Hybrid Pattern: Best of Both

```text
src/
├── main.ts                    ← SPA router (if needed)
├── shared/
│   ├── meeting-projection.ts  ← Shared across pages
│   └── types.ts
├── pages/
│   ├── admin/
│   │   ├── index.ts           ← Can be SPA route OR MPA entry
│   │   ├── index.html
│   │   └── admin-projection.ts
│   └── user/
│       ├── index.ts
│       ├── index.html
│       └── user-projection.ts
└── index.html                 ← SPA entry OR MPA fallback
```

### Flexibility Options

- **Build as SPA** (single entry, client-side routing)
- **Build as MPA** (multiple entries, server-side routing)
- **Build as hybrid** (SPA for admin panel, MPA for public pages)
- **The same projection code works for all three**

---

## 🧪 Tested & Stable

HTMP is covered by smoke tests for:

    Text inputs, textareas, selects

    Boolean attribute bindings (:disabled, :checked)

    Form interactions — no flicker, no loss of focus

    Deep reactivity on nested objects and arrays

---

## License

MIT