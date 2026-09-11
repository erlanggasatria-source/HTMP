import { logger, PolarisRuntime, type IWorkflowEvent } from '@polaris-runtime/core/dev';
import { type INoteData } from './models/NoteModel';
import { notePlugin } from './plugins/note.plugin';
import './src/index.css';
import HTMP from 'htm-projection';

// ==========================================
// 1. CORE RUNTIME SETUP
// ==========================================
export const runtime = new PolarisRuntime();
runtime.register([notePlugin]);

export const can = (workflowPath: string, input?: any): boolean => {  
  const result = runtime.canExecute(workflowPath, input);
  return result.allowed;
};

// ==========================================
// 2. P1 — PATTERN (HTML Blueprint & Directives)
// ==========================================
const pattern = `
  <div class="app-container">
    <header>
      <h1>🔐 HTMP Example: Note Guard App</h1>
      <span>
        💡 <strong>Pro Tip:</strong> Allow browser pop-ups to open <strong>Polaris Explorer</strong> for self-describing app documentation!
      </span>
      <p>Powered by @polaris-runtime/core for class-based model logic, declarative rule checks, and reactive UI guards through can(). HTMP acts as a lightweight presentation layer with a 2.8 kB gzip footprint, offering a lean alternative to large frameworks such as React, Vue, Angular, Svelte, and Solid.</p>
    </header>

    <!-- Global State Projection via Ternary Style -->
    <div class="loading-bar">{{ loading ? 'Processing workflow...' : ''}}</div>
    <div :class="'toast-'+toast.type">
      {{ toast.message }}
    </div>

    <main>
      <!-- Add Note Form Component -->
      <div style="margin-bottom: 2rem; padding: 1rem; border: 1px solid #ccc; border-radius: 8px;">
        <h3>Add New Note</h3>
        <form @submit="handleCreateNote(e)">
          <div style="margin-bottom: 0.5rem;">
            <input
              type="text"
              placeholder="Note title..."
              @input="updateCreateTitle(e)"
              style="width: 100%; padding: 8px; box-sizing: border-box;"
            />
          </div>
          <div style="margin-bottom: 0.5rem;">
            <textarea
              placeholder="Note content..."
              @input="updateCreateContent(e)"
              rows="3"
              style="width: 100%; padding: 8px; box-sizing: border-box;"
            ></textarea>
          </div>
          <button type="submit" style="padding: 8px 16px; cursor: pointer; background: #0066cc; color: #fff; border: none; border-radius: 4px;">
            Save Note
          </button>
        </form>
      </div>

      <!-- Notes List Collection -->
      <div class="note-list-container">
        <h2 style="margin-bottom: 1rem; font-size: 1.25rem;">
          Notes Collection ({{ notes.length }})
        </h2>

        <p style="color: #64748b;">
          {{ notes.length === 0 ? 'No notes found. Create your first draft note above!' : '' }}
        </p>

        <div class="note-grid">          
          <div :for="note in notes">
            <div :class="'note-card status-'+note.status" >
              <div class="card-header">
                <span :class="'badge badge-'+note.status">{{ note.status.toUpperCase() }}</span>
                <small style="color: #64748b; font-size: 0.75rem;">
                  {{ note.formattedTime }}
                </small>
              </div>

              <!-- Dedicated Edit Mode Form Buffer -->              
              <div class="edit-box" :style="editingId === note.id ? 'display: block;' : 'display: none;'">
                <input 
                  :value="editForm.title" 
                  @input="updateEditTitle(e)" 
                  style="width: 100%; padding: 6px; margin-bottom: 0.5rem; box-sizing: border-box;" 
                />
                <textarea 
                  @input="updateEditContent(e)" 
                  rows="3" 
                  style="width: 100%; padding: 6px; margin-bottom: 0.5rem; box-sizing: border-box;"
                >{{ editForm.content }}</textarea>
                <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                  <button @click="saveUpdate(note)" style="background: #16a34a; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Save</button>
                  <button @click="cancelEdit()" style="background: #475569; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Cancel</button>
                </div>
              </div>

              <!-- Read Mode View -->
              <div :style="editingId === note.id ? 'display: none;' : 'display: block;'">
                <h3 class="card-title">{{ note.title }}</h3>
                <p class="card-body">{{ note.content }}</p>
              </div>
            </div>

            <!-- Action Buttons with Attribute Removal Boolean Sync -->
            <div class="card-actions">
              <button :disabled="!note.canEdit" @click="startEdit(note)">
                ✏️ Edit
              </button>
              <button :disabled="!note.canLock" @click="lockNote(note)">
                🔒 Lock
              </button>
              <button :disabled="!note.canDelete" @click="deleteNote(note)">
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
`;

// Instansiasi Projection App Root
interface NoteAppState {
  loading: boolean;
  currentStep: string;
  toast: { message: string; type: 'success' | 'error' } | null;
  notes: Array<any>;
  editingId: string | null;
  editForm: {
    title: string;
    content: string;
  };
}
const appProjection = new HTMP<NoteAppState>('root', pattern);

// Plain JS Memory Buffer untuk Form Create
let createTitle = '';
let createContent = '';

// Helper Evaluasi Guard & Format Note
const enrichNotes = (rawNotes: INoteData[]) => {
  return rawNotes.map((note) => ({
    ...note,
    formattedTime: new Date(note.updatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    canEdit: can('note/wf-update', note),
    canLock: can('note/wf-lock', note),
    canDelete: can('note/wf-delete', note),
  }));
};

// ==========================================
// 3. P2 — PROXY (Reactive State Initial Block)
// ==========================================
appProjection.setProxy({
  loading: false,
  currentStep: '',
  toast: null as { message: string; type: 'success' | 'error' } | null,
  notes: [] as Array<any>,
  editingId: '' as string | null, // Isolated ID untuk item yang diedit
  editForm: { title: '', content: ''} // Dedicated Form Buffer Proxy khusus Edit
});

// ==========================================
// 4. P3 — PROGRAM (Pure Method Control)
// ==========================================
appProjection.setProgram({
  // --- Create Form Handlers ---
  updateCreateTitle: (e: any) => { createTitle = e.target.value; },
  updateCreateContent: (e: any) => { createContent = e.target.value; },

  handleCreateNote: async (...args: unknown[]) => {
    const e = args[0] as Event & { target: HTMLFormElement | null };
    e?.preventDefault?.();
    try {
      await runtime.execute('note/wf-create', {
        title: createTitle,
        content: createContent,
      });
      createTitle = '';
      createContent = '';
      if (e?.target instanceof HTMLFormElement) {
        e.target.reset();
      }
    } catch (err) {
      // Handled globally
    }
  },

  // --- List Fetcher ---
  fetchNotes: async () => {
    const res = await runtime.execute('note/wf-list', { _t: Date.now() });
    if (res.status === 'success') {
      appProjection.proxy.notes = enrichNotes(res.payload || []);
    }
  },

  // --- Dedicated Edit Handlers (No Contamination) ---
  startEdit: (note: any) => {
    appProjection.proxy.editForm = { title: note.title, content: note.content };
    appProjection.proxy.editingId = note.id;
  },

  cancelEdit: () => {
    appProjection.proxy.editForm = { title: '', content: '' };
    appProjection.proxy.editingId = null;
  },

  updateEditTitle: (e: any) => {
    appProjection.proxy.editForm.title = e.target.value;
  },

  updateEditContent: (e: any) => {
    appProjection.proxy.editForm.content = e.target.value;
  },

  saveUpdate: async (note: any) => {
    const result = await runtime.execute('note/wf-update', {
      ...note,
      title: appProjection.proxy.editForm.title,
      content: appProjection.proxy.editForm.content,
    });

    if (result.status === 'success') {
      appProjection.programs.cancelEdit();      
    }
  },

  lockNote: async (note: any) => {
    await runtime.execute('note/wf-lock', { id: note.id, status: note.status });
  },

  deleteNote: async (note: any) => {
    await runtime.execute('note/wf-delete', { id: note.id, status: note.status });
  },
});

// ==========================================
// 5. LIFECYCLE & GLOBAL RUNTIME SUBSCRIBER
// ==========================================
runtime.subscribeAll((event: IWorkflowEvent) => {
  logger.debug('App Lifecycle Event:', event.type, event);

  if (event.type === 'workflow_started') {
    appProjection.proxy.loading = true;
    appProjection.proxy.currentStep = `Executing ${event.workflowPath}...`;
  }

  if (event.type === 'step_started') {
    appProjection.proxy.currentStep = `Step: ${event.stepName}`;
  }

  if (event.type === 'workflow_completed') {
    appProjection.proxy.loading = false;
    appProjection.proxy.currentStep = '';

    if (event.workflowPath !== 'note/wf-list') {
      const successMessage = event.output?.message || `Operation completed: ${event.workflowPath}`;
      appProjection.proxy.toast = { message: `✅ ${successMessage}`, type: 'success' };
      setTimeout(() => { appProjection.proxy.toast = null; }, 3000);

      // Refresh list otomatis setelah Workflow berhasil
      appProjection.programs.fetchNotes();
    }
  }

  if (event.type === 'workflow_failed') {
    appProjection.proxy.loading = false;
    appProjection.proxy.currentStep = '';
    const errorMessage = event.error || 'Execution failed';
    appProjection.proxy.toast = { message: `❌ ${errorMessage}`, type: 'error' };
    setTimeout(() => { appProjection.proxy.toast = null; }, 4000);
  }
});

// ==========================================
// 6. MOUNTING TO DOM
// ==========================================
appProjection.mount();
appProjection.programs.fetchNotes();

export default appProjection;