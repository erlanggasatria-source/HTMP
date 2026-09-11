import { IPlugin, logger, successResult, errorResult } from '@polaris-runtime/core';
import { NoteModel, INoteData } from '../models/NoteModel';

// In-Memory Storage
let notesStore: NoteModel[] = [];

export const notePlugin: IPlugin = {
  name: 'note',
  description: 'note example with guard or rule permition',
  version: '1.1.0',
  capabilities: [
    {
      name: 'note/cap-validate',
      description: 'Validates note title and content input',
      run: async (input) => {
        // Unwrap payload dari Engine jika dibungkus
        const data = input?.payload ? input.payload : input;
        logger.debug('[note/cap-validate] Validating data:', data);

        const note = new NoteModel(data);

        if (!note.validate()) {
          const errorMsg = note.getFormattedErrorMessage();
          logger.error('[note/cap-validate] Validation failed:', errorMsg);
          throw new Error(errorMsg);
        }

        logger.info('[note/cap-validate] Validation passed for note:', note.id);
        return successResult(note.toJSON(), 'note', note.id, 'Note validation passed');
      },
    },
    {
      name: 'note/cap-save',
      description: 'Saves new draft note instance to storage',
      run: async (input) => {
        const data = input?.payload ? input.payload : input;
        logger.debug('[note/cap-save] Saving note data:', data);

        const note = new NoteModel(data);
        notesStore.push(note);

        logger.info('[note/cap-save] Note saved successfully. Total:', notesStore.length);
        return successResult(note.toJSON(), 'note', note.id, 'Draft note created successfully');
      },
    },
    {
      name: 'note/cap-list',
      description: 'Fetches all notes from storage',
      run: async (input) => {
        logger.debug('[note/cap-list] Fetching notes...');
        const plainNotes = notesStore.map((n) => n.toJSON());
        return successResult(plainNotes, 'note', undefined, 'Notes retrieved successfully');
      },
    },
    {
      name: 'note/cap-update',
      description: 'Updates existing draft note data with re-validation',
      run: async (input: any) => {
        const data = input?.payload ? input.payload : input;
        logger.debug('[note/cap-update] Updating note ID:', data.id);

        const note = notesStore.find((n) => n.id === data.id);
        if (!note) {
          logger.error('[note/cap-update] Note not found:', data.id);
          throw new Error(`Note with ID ${data.id} not found`);
        }

        // Re-validasi data input baru
        const incomingModel = new NoteModel(data);
        if (!incomingModel.validate()) {
          const errorMsg = incomingModel.getFormattedErrorMessage();
          logger.error('[note/cap-update] Re-validation failed:', errorMsg);
          throw new Error(`Update failed: ${errorMsg}`);
        }

        // Jalankan method domain updateContent
        note.updateContent(data.title, data.content);
        logger.info('[note/cap-update] Note updated successfully:', data.id);

        return successResult(note.toJSON(), 'note', data.id, 'Note updated successfully');
      },
    },
    {
      name: 'note/cap-lock',
      description: 'Changes note status from draft to locked',
      run: async (input: any) => {
        const data = input?.payload ? input.payload : input;
        logger.debug('[note/cap-lock] Locking note ID:', data.id);

        const note = notesStore.find((n) => n.id === data.id);
        if (!note) {
          logger.error('[note/cap-lock] Note not found:', data.id);
          throw new Error(`Note with ID ${data.id} not found`);
        }

        note.lock();
        logger.info('[note/cap-lock] Note status locked:', data.id);

        return successResult(note.toJSON(), 'note', data.id, 'Note status locked successfully');
      },
    },
    {
      name: 'note/cap-delete',
      description: 'Deletes draft note from storage',
      run: async (input: any) => {
        const data = input?.payload ? input.payload : input;
        logger.debug('[note/cap-delete] Deleting note ID:', data.id);

        const exists = notesStore.some((n) => n.id === data.id);
        if (!exists) {
          logger.error('[note/cap-delete] Note not found:', data.id);
          throw new Error(`Note with ID ${data.id} not found`);
        }

        notesStore = notesStore.filter((n) => n.id !== data.id);
        logger.info('[note/cap-delete] Note deleted:', data.id);

        return successResult({ id: data.id }, 'note', data.id, 'Note deleted successfully');
      },
    },
  ],

  workflows: [
    {
      name: 'note/wf-create',
      description: 'Creates a new draft note',
      allowed: [],
      steps: [
        { name: 'validate-input', useCapability: 'note/cap-validate' },
        { name: 'save-note', useCapability: 'note/cap-save' },
      ],
    },
    {
      name: 'note/wf-list',
      description: 'Retrieves all notes',
      allowed: [],
      steps: [
        { name: 'fetch-notes', useCapability: 'note/cap-list' },
      ],
    },
    {
      name: 'note/wf-update',
      description: 'Updates an existing draft note',
      allowed: [
        { key: 'status', value: 'draft', source: 'input', operator: 'eq' },
      ],
      steps: [
        { name: 'update-note', useCapability: 'note/cap-update' },
      ],
    },
    {
      name: 'note/wf-lock',
      description: 'Locks a note to prevent further editing or deletion',
      allowed: [
        { key: 'status', value: 'draft', source: 'input', operator: 'eq' },
      ],
      steps: [
        { name: 'lock-note', useCapability: 'note/cap-lock' },
      ],
    },
    {
      name: 'note/wf-delete',
      description: 'Deletes a draft note',
      allowed: [
        { key: 'status', value: 'draft', source: 'input', operator: 'eq' },
      ],
      steps: [
        { name: 'delete-note', useCapability: 'note/cap-delete' },
      ],
    },
  ],
};