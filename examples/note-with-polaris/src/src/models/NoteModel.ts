export type NoteStatus = 'draft' | 'locked';
export type ValidationErrorTuple = [key: string, message: string];

export interface INoteData {
  id?: string;
  title: string;
  content: string;
  status?: NoteStatus;
  createdAt?: number;
  updatedAt?: number;
}

export class NoteModel {
  public id: string;
  public title: string;
  public content: string;
  public status: NoteStatus;
  public createdAt: number;
  public updatedAt: number;

  private errors: ValidationErrorTuple[] = [];

  constructor(data: Partial<INoteData> = {}) {
    this.id = data.id || `note-${Date.now()}`;
    this.title = data.title?.trim() || '';
    this.content = data.content?.trim() || '';
    this.status = data.status || 'draft'; // Automatic default: draft
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
  }

  public validate(): boolean {
    this.errors = [];

    if (!this.title) {
      this.addError('title', 'Title is required');
    } else if (this.title.length < 3) {
      this.addError('title', 'Title must be at least 3 characters');
    }

    if (!this.content) {
      this.addError('content', 'Content is required');
    }

    return this.errors.length === 0;
  }

  /**
   * Domain method: Updates title and content while refreshing timestamp
   */
  public updateContent(title: string, content: string): void {
    this.title = title.trim();
    this.content = content.trim();
    this.updatedAt = Date.now();
  }

  /**
   * Domain method: Locks note status while refreshing timestamp
   */
  public lock(): void {
    this.status = 'locked';
    this.updatedAt = Date.now();
  }

  public addError(key: string, message: string): void {
    this.errors.push([key, message]);
  }

  public getErrors(): ValidationErrorTuple[] {
    return this.errors;
  }

  public getFormattedErrorMessage(): string {
    return this.errors.map(([key, msg]) => `${key}: ${msg}`).join(' | ');
  }

  public toJSON(): INoteData {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}