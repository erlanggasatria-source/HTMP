/**
 * Registry binding entry for text, attribute, or list renderings
 */
export interface TextBinding {
  type: 'text';
  path: number[];
  rawText: string;
  rawMatch: string;
  expr: string;
}

export interface AttributeBinding {
  type: 'attribute';
  path: number[];
  attrName: string;
  attrExpr: string;
}

export interface ListBinding {
  type: 'list';
  templateNode: Element;
  parentEl: Element | null;
  itemName: string;
  listKey: string;
  originalHTML: string;
}

export type RegistryBinding = TextBinding | AttributeBinding | ListBinding;

/**
 * Lifecycle hook callback
 */
export type LifecycleHook = () => void;

/**
 * Program definition (method bound to HTMP instance)
 */
export type ProgramCallback = (...args: unknown[]) => unknown;

/**
 * Deep reactive proxy wrapper
 */
export type DeepReactive<T> = T extends object ? (
  T extends (...args: never[]) => unknown ? T : T & Record<string | symbol, unknown>
) : T;

/**
 * HTMP constructor options
 */
export interface HTMPOptions {
  rootId?: string;
  templateString?: string;
}

/**
 * Event handler descriptors
 */
export interface EventDescriptor {
  eventName: string;
  programName: string;
  paramName?: string;
}