import type {
  DeepReactive,
  LifecycleHook,
  ListBinding,
  ProgramCallback,
  RegistryBinding
} from './types';

export type {
  AttributeBinding,
  DeepReactive,
  EventDescriptor,
  HTMPOptions,
  LifecycleHook,
  ListBinding,
  ProgramCallback,
  RegistryBinding,
  TextBinding 
} from './types';

type EventHandlerElement = HTMLElement & Record<string, ((event: Event) => void) | null>;

export class HTMP<T extends Record<string, any> = Record<string, any>> {
  private rootId: string;
  private parser: DOMParser;
  public proxy: T;
  private dom: Element | null;
  public programs: Record<string, ProgramCallback>;
  private registry: Record<string, RegistryBinding[]>;
  private pendingDiff: Set<string>;
  public isMounted: boolean;
  private hooks: {
    mount: LifecycleHook[];
    unmount: LifecycleHook[];
    remount: LifecycleHook[];
    destroy: LifecycleHook[];
  };

  constructor(rootId: string, templateString: string) {
    this.rootId = rootId;
    this.parser = new DOMParser();
    this.dom = this.parser.parseFromString(templateString, 'text/html').body.firstElementChild;
    
    this.programs = {};
    this.registry = {};
    this.pendingDiff = new Set<string>();
    this.isMounted = false;
    
    this.hooks = {
      mount: [],
      unmount: [],
      remount: [],
      destroy: []
    };

    const self = this;
    this.proxy = new Proxy({}, {
      set(target, key, value: unknown) {
        (target as Record<PropertyKey, unknown>)[key] = self.makeDeepReactive(value, String(key));
        self.pendingDiff.add(String(key));
        if (self.isMounted) self.renderDiff();
        return true;
      }
    }) as T;
    
    if (this.dom) {
      this.compile(this.dom, []);
    }
  }

  setProxy(keyOrObject: keyof T | Partial<T>, value?: unknown): void {
    if (typeof keyOrObject === 'object' && !Array.isArray(keyOrObject)) {
      Object.keys(keyOrObject).forEach(k => {
        (this.proxy as any)[k] = (keyOrObject as any)[k];
      });
    } else {
      (this.proxy as any)[keyOrObject as string] = value;
    }
  }

  setProgram(nameOrObject: string | Record<string, ProgramCallback>, fn?: ProgramCallback): void {
    if (typeof nameOrObject === 'object') {
      Object.keys(nameOrObject).forEach(key => {
        this.programs[key] = nameOrObject[key];
      });
    } else if (typeof nameOrObject === 'string' && fn) {
      this.programs[nameOrObject] = fn;
    }
  }

  onMount(fn: LifecycleHook): void { this.hooks.mount.push(fn); }
  onUnmount(fn: LifecycleHook): void { this.hooks.unmount.push(fn); }
  onRemount(fn: LifecycleHook): void { this.hooks.remount.push(fn); }
  onDestroy(fn: LifecycleHook): void { this.hooks.destroy.push(fn); }

  makeDeepReactive<T>(obj: T, proxyKey: string): DeepReactive<T> {
    if (typeof obj !== 'object' || obj === null) return obj as DeepReactive<T>;
    const self = this;
    return new Proxy(obj, {
      get(target, key, receiver) {
        const val = Reflect.get(target, key, receiver);
        // Jika valuenya adalah object/array, bungkus dengan Proxy juga!
        if (typeof val === 'object' && val !== null) {
          return self.makeDeepReactive(val, proxyKey);
        }
        return val;
      },
      set(target, key, value: unknown) {
        Reflect.set(target, key, value);
        self.pendingDiff.add(proxyKey);
        if (self.isMounted) self.renderDiff();
        return true;
      }
    }) as DeepReactive<T>;
  }

  compile(node: Node, currentPath: number[]) {
    if (node.nodeType === Node.TEXT_NODE) {
      const regex = /\{\{\s*(.*?)\s*\}\}/g;
      const rawText = node.nodeValue || '';
      let match;
      while ((match = regex.exec(rawText)) !== null) {
        const expr = match[1];
        const rawMatch = match[0];
        const cleanExpr = expr.replace(/'[^']*'|\"[^\"]*\"/g, '');
        const vars = cleanExpr.match(/[a-zA-Z_][a-zA-Z0-9_.]*/g) || [];
        const rootKeys = new Set<string>();
        vars.forEach(v => rootKeys.add(v.split('.')[0]));
        
        if (rootKeys.size === 0) rootKeys.add(expr);
        
        rootKeys.forEach(key => {
          if (!this.registry[key]) this.registry[key] = [];
          this.registry[key].push({
            type: 'text',
            path: [...currentPath],
            rawText,
            rawMatch,
            expr
          });
        });
      }
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      let isListTemplate = false;
      for (const attr of Array.from((node as Element).attributes)) {
        if (attr.name.startsWith('@')) {
          const eventName = attr.name.slice(1);
          const rawValue = attr.value.trim();
          const match = rawValue.match(/(\w+)\(([^)]*)\)/);
          
          if (match) {
            const programName = match[1];
            const argsStr = match[2].trim();
            const argTokens = argsStr ? argsStr.split(',').map(s => s.trim()) : [];
            
            (node as Element & { [key: string]: unknown })[`on${eventName}`] = (e: Event) => {
              if (this.programs[programName]) {
                const finalArgs = argTokens.map(token => {
                  if (token === 'e' || token === 'event') return e;
                  if ((token.startsWith("'") && token.endsWith("'")) || (token.startsWith('"') && token.endsWith('"'))) {
                    return token.slice(1, -1);
                  }
                  if (!isNaN(Number(token))) return Number(token);
                  return token;
                });
                this.programs[programName](...finalArgs);
              }
            };
          } else {
            const programName = rawValue;
            (node as Element & { [key: string]: unknown })[`on${eventName}`] = (e: Event) => {
              if (this.programs[programName]) this.programs[programName](e);
            };
          }
          (node as Element).removeAttribute(attr.name);
        }
        else if (attr.name.startsWith(':') && attr.name !== ':for') {
          const realAttrName = attr.name.slice(1);
          const expr = attr.value;
          const cleanExpr = expr.replace(/'[^']*'|\"[^\"]*\"/g, '');
          const vars = cleanExpr.match(/[a-zA-Z_][a-zA-Z0-9_.]*/g) || [];
          const rootKeys = new Set<string>();
          vars.forEach(v => rootKeys.add(v.split('.')[0]));
          
          if (rootKeys.size === 0) rootKeys.add(expr);
          
          rootKeys.forEach(key => {
            if (!this.registry[key]) this.registry[key] = [];
            this.registry[key].push({
              type: 'attribute',
              path: [...currentPath],
              attrName: realAttrName,
              attrExpr: expr
            });
          });
          (node as Element).removeAttribute(attr.name);
        }
        else if (attr.name === ':for') {
          const match = attr.value.match(/(\w+)\s+in\s+(\w+)/);
          if (match) {
            const itemName = match[1];
            const listKey = match[2];
            const originalHTML = (node as Element).outerHTML;

            const listBinding: ListBinding = {
              type: 'list',
              templateNode: node as Element,
              parentEl: node.parentNode as Element,
              itemName,
              listKey,
              originalHTML: originalHTML
            };
            
            // === SOLUSI: Pindai isi template :for untuk mencari root proxy lain ===
            const innerHTML = (node as Element).innerHTML;
            const regexText = /\{\{\s*(.*?)\s*\}\}/g;
            const regexAttr = /:\w+="([^"]+)"/g;
            const allExprs: string[] = [];
            let m;
            
            // Kumpulkan semua ekspresi dari {{ }} dan :attr di dalam loop
            while ((m = regexText.exec(innerHTML)) !== null) allExprs.push(m[1]);
            while ((m = regexAttr.exec(innerHTML)) !== null) allExprs.push(m[1]);
            
            const rootKeysInLoop = new Set<string>();
            allExprs.forEach(expr => {
               const cleanExpr = expr.replace(/'[^']*'|"[^"]*"/g, '');
               const vars = cleanExpr.match(/[a-zA-Z_][a-zA-Z0-9_.]*/g) || [];
               vars.forEach(v => {
                 const rootKey = v.split('.')[0];
                 // Daftarkan semua root key, KECUALI variabel item loop itu sendiri (misal 'note')
                 if (rootKey !== itemName) {
                   rootKeysInLoop.add(rootKey);
                 }
               });
            });
            // ==================================================================

            // 1. Daftarkan key utama array (misal: 'notes') untuk memicu renderList
            if (!this.registry[listKey]) this.registry[listKey] = [];
            this.registry[listKey].push(listBinding);
            
            // 2. Daftarkan root proxy lain (misal: 'editingId', 'editForm') agar juga memicu renderList!
            rootKeysInLoop.forEach(key => {
              if (!this.registry[key]) this.registry[key] = [];
              // Push listBinding yang SAMA agar terhubung ke renderList yang sama
              this.registry[key].push(listBinding);
            });

            (node as Element).removeAttribute(':for');
            isListTemplate = true; 
          }
        }
      }
      
      if (!isListTemplate) {
        Array.from(node.childNodes).forEach((child, index) => {
          this.compile(child, [...currentPath, index]);
        });
      }
    }
  }

  renderDiff() {
    if (this.pendingDiff.size === 0 || !this.dom) return;
    const rootEl = this.dom;
    
    this.pendingDiff.forEach((key: string) => {
      if (this.registry[key]) {
        this.registry[key].forEach((binding: RegistryBinding) => {
          if (binding.type === 'list') this.renderList(binding);
          else if (binding.type === 'text') this.renderText(binding, rootEl);
          else if (binding.type === 'attribute') this.renderAttribute(binding, rootEl);
        });
      }
    });
    this.pendingDiff.clear();
  }

  renderText(binding: Extract<RegistryBinding, { type: 'text' }>, rootEl: Element): void {
    let targetNode: Node | null = rootEl;
    binding.path.forEach((index: number) => {
      if (targetNode) targetNode = targetNode.childNodes[index];
    });
    
    if (targetNode && targetNode.nodeType === Node.TEXT_NODE) {
      const textNode = targetNode as Text;
      const rawText = binding.rawText;
      
      // Ganti SEMUA {{ }} yang ada di text node ini sekaligus
      const newText = rawText.replace(/\{\{\s*(.*?)\s*\}\}/g, (_match: string, expr: string) => {
        let val: unknown;
        try {
          // Evaluasi ekspresi menggunakan root proxy
          const func = new Function('proxy', `return proxy.${expr};`);
          val = func(this.proxy);
        } catch(e) { 
          val = ''; 
        }
        
        // Jika undefined/null, kembalikan string kosong agar tidak tampil "undefined"
        return val !== undefined && val !== null ? String(val) : '';
      });
      
      // Hanya update DOM jika teksnya benar-benar berubah (mencegah cursor reset)
      if (textNode.nodeValue !== newText) {
        textNode.nodeValue = newText;
      }
    }
  }

  renderAttribute(binding: Extract<RegistryBinding, { type: 'attribute' }>, rootEl: Element): void {
    let targetNode: Node | null = rootEl;
    binding.path.forEach((index: number) => {
      if (targetNode) targetNode = targetNode.childNodes[index];
    });
    
    if (targetNode && targetNode.nodeType === Node.ELEMENT_NODE) {
      const el = targetNode as Element;
      let val: unknown;
      try {
        const func = new Function('proxy', `return proxy.${binding.attrExpr};`);
        val = func(this.proxy);
      } catch(e) { val = undefined; }
      
      const realAttrName = binding.attrName;
      const strVal = String(val);

      // KHUSUS FORM ELEMENTS
      if (realAttrName === 'value' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
        if ((el as HTMLInputElement).value !== strVal) {
          (el as HTMLInputElement).value = strVal;
        }
        if (el.tagName === 'SELECT') {
          Array.from(el.querySelectorAll('option')).forEach((opt: Element) => {
            const htmlOpt = opt as HTMLOptionElement;
            if (htmlOpt.value === strVal) {
              if (!htmlOpt.selected) htmlOpt.selected = true;
            } else {
              if (htmlOpt.selected) htmlOpt.selected = false;
            }
          });
        }
      } 
      else if (val === false || val === null || val === undefined) {
        el.removeAttribute(realAttrName);
      } else if (val === true) {
        el.setAttribute(realAttrName, '');
      } else {
        el.setAttribute(realAttrName, strVal);
      }
    }
  }

  renderList(binding: Extract<RegistryBinding, { type: 'list' }>): void {
    const items = Array.isArray(this.proxy[binding.listKey]) ? this.proxy[binding.listKey] as unknown[] : [];
    const { templateNode, parentEl, itemName, originalHTML } = binding; // Ambil originalHTML
    if (!parentEl) return;
    
    const actualParent = parentEl;
    const newKeys = new Set<string>();
    
    // === SOLUSI: Parse ulang HTML asli agar struktur dan atribut 100% utuh! ===
    const wrapper = document.createElement('div');
    wrapper.innerHTML = originalHTML;
    const freshTemplate = wrapper.firstElementChild as Element;

    const proxyKeys = Object.keys(this.proxy);
    const evalInLoop = (expr: string, item: unknown): unknown => {
      const strings: string[] = [];
      let maskedExpr = expr.replace(/'[^']*'|"[^"]*"/g, (match) => {
        strings.push(match);
        return `__STR_${strings.length - 1}__`;
      });

      let finalExpr = maskedExpr;
      proxyKeys.forEach(k => {
        finalExpr = finalExpr.replace(new RegExp(`(^|[^.\\w])${k}\\b`, 'g'), `$1proxy.${k}`);
      });
      finalExpr = finalExpr.replace(new RegExp(`(^|[^.\\w])${itemName}\\b`, 'g'), `$1item`);
      finalExpr = finalExpr.replace(/__STR_(\d+)__/g, (_m, idx) => strings[parseInt(idx)]);

      try {
        const func = new Function('proxy', 'item', `return ${finalExpr};`);
        return func(this.proxy, item);
      } catch(e) { 
        console.error("Eval error in loop:", e, finalExpr); 
        return undefined; 
      }
    };

    items.forEach((item: unknown, index: number) => {
      const itemRecord = typeof item === 'object' && item !== null ? item as Record<string, unknown> : null;
      const itemKey = itemRecord?.id !== undefined ? itemRecord.id : index;
      const domId = `${binding.listKey}-${itemKey}`;
      newKeys.add(domId);

      let childNode = actualParent.querySelector(`#${domId}`) as HTMLElement | null;
      
      if (!childNode) {
        childNode = freshTemplate.cloneNode(true) as HTMLElement;
        childNode.id = domId;
        actualParent.appendChild(childNode);
        this.processListItem(childNode, freshTemplate, item, itemName, evalInLoop, true);
      } else {
        this.processListItem(childNode, freshTemplate, item, itemName, evalInLoop, false);
      }
    });

    for (let i = actualParent.children.length - 1; i >= 0; i--) {
      const node = actualParent.children[i];
      if (node.id.startsWith(`${binding.listKey}-`) && !newKeys.has(node.id)) {
        actualParent.removeChild(node);
      }
    }
  }

  // HELPER BARU: Untuk update in-place tanpa merusak fokus input
  processListItem(
    clonedNode: Node, 
    templateNode: Node, 
    item: unknown, 
    itemName: string, 
    evalInLoop: (expr: string, item: unknown) => unknown,
    isFirstRender: boolean
  ): void {
    if (clonedNode.nodeType === Node.TEXT_NODE && templateNode.nodeType === Node.TEXT_NODE) {
      const tNode = templateNode as Text;
      const cNode = clonedNode as Text;
      const rawText = tNode.nodeValue || '';
      const newVal = rawText.replace(/\{\{\s*(.*?)\s*\}\}/g, (_match, expr) => {
        const val = evalInLoop(expr, item);
        return val !== undefined && val !== null ? String(val) : '';
      });
      if (cNode.nodeValue !== newVal) {
        cNode.nodeValue = newVal;
      }
    } 
    else if (clonedNode.nodeType === Node.ELEMENT_NODE && templateNode.nodeType === Node.ELEMENT_NODE) {
      const cEl = clonedNode as Element;
      const tEl = templateNode as Element;
      
      for (const attr of Array.from(tEl.attributes)) {
        if (attr.name.startsWith('@')) {
          const eventName = attr.name.slice(1);
          const rawValue = attr.value.trim();
          const match = rawValue.match(/(\w+)\(([^)]*)\)/);
          
          if (match) {
            const programName = match[1];
            const argsStr = match[2].trim();
            const argTokens = argsStr ? argsStr.split(',').map(s => s.trim()) : [];
            
            (cEl as EventHandlerElement)[`on${eventName}`] = (e: Event) => {
              if (this.programs[programName]) {
                const finalArgs = argTokens.map(token => {
                  if (token === 'e' || token === 'event') return e;
                  if ((token.startsWith("'") && token.endsWith("'")) || (token.startsWith('"') && token.endsWith('"'))) {
                    return token.slice(1, -1);
                  }
                  if (!isNaN(Number(token))) return Number(token);
                  if (typeof itemName !== 'undefined' && token === itemName) return item;
                  return token;
                });
                this.programs[programName](...finalArgs);
              }
            };
          } else {
            const programName = rawValue;
            (cEl as EventHandlerElement)[`on${eventName}`] = (e: Event) => {
              if (this.programs[programName]) this.programs[programName](e);
            };
          }
          
          if (isFirstRender) cEl.removeAttribute(attr.name);
        }
        else if (attr.name.startsWith(':')) {
          const realAttrName = attr.name.slice(1);
          const expr = attr.value;
          const val = evalInLoop(expr, item);

          // KHUSUS FORM ELEMENTS: Set properti .value, BUKAN atribut
          if (realAttrName === 'value' && (cEl.tagName === 'INPUT' || cEl.tagName === 'TEXTAREA' || cEl.tagName === 'SELECT')) {
            const strVal = String(val);
            if ((cEl as HTMLInputElement).value !== strVal) {
              (cEl as HTMLInputElement).value = strVal;
            }
            
            // KHUSUS SELECT: Setelah set value, pastikan option yang sesuai ter-selected
            if (cEl.tagName === 'SELECT') {
              Array.from(cEl.querySelectorAll('option')).forEach((opt: Element) => {
                const htmlOpt = opt as HTMLOptionElement;
                if (htmlOpt.value === strVal) {
                  if (!htmlOpt.selected) htmlOpt.selected = true;
                } else {
                  if (htmlOpt.selected) htmlOpt.selected = false;
                }
              });
            }
          } 
          // BOOLEAN ATTRIBUTES (seperti disabled, checked)
          else if (val === false || val === null || val === undefined) {
            cEl.removeAttribute(realAttrName);
          } else if (val === true) {
            cEl.setAttribute(realAttrName, '');
          } 
          // ATRIBUT BIASA (class, href, dll)
          else {
            cEl.setAttribute(realAttrName, String(val));
          }        
          if (isFirstRender) cEl.removeAttribute(attr.name);
        }
      }

      // Rekursi ke anak-anak elemen saat ini
      const cChildren = Array.from(cEl.childNodes);
      const tChildren = Array.from(tEl.childNodes);
      for (let i = 0; i < cChildren.length; i++) {
        if (tChildren[i]) {
          this.processListItem(cChildren[i], tChildren[i], item, itemName, evalInLoop, isFirstRender);
        }
      }
    }
  }

  mount(targetId?: string) {
    if (targetId) this.rootId = targetId;
    const target = document.getElementById(this.rootId);
    if (target && this.dom) {
      target.innerHTML = '';
      target.appendChild(this.dom);
      
      Object.values(this.registry).flat().forEach((b: RegistryBinding) => {
        if (b.type === 'list' && b.templateNode.parentNode) {
          b.templateNode.parentNode.removeChild(b.templateNode);
        }
      });

      this.isMounted = true;
      
      // === DX WARNING: Cek variabel reaktif yang belum dideklarasikan ===
      const registeredKeys = Object.keys(this.registry);
      const proxyKeys = Object.keys(this.proxy);
      
      registeredKeys.forEach(key => {
        if (!proxyKeys.includes(key)) {
          console.warn(`[HTMP Warn] Variabel "${key}" digunakan di template, tetapi belum didaftarkan di proxy. UI mungkin tidak akan reaktif terhadap perubahannya.`);
        }
      });
      // ================================================================

      this.renderDiff();
      this.hooks.mount.forEach(fn => fn());
    } else {
      console.error(`Root ID ${this.rootId} tidak ditemukan!`);
    }
  }

  unmount() {
    const target = document.getElementById(this.rootId);
    if (target && this.dom && this.dom.parentNode === target) {
      target.removeChild(this.dom);
    }
    this.isMounted = false;
    this.hooks.unmount.forEach(fn => fn());
  }

  remount(targetId?: string) {
    if (targetId) this.rootId = targetId;
    const target = document.getElementById(this.rootId);
    if (target && this.dom) {
      target.innerHTML = '';
      target.appendChild(this.dom);
      this.isMounted = true;
      this.renderDiff();
      this.hooks.remount.forEach(fn => fn());
    } else {
      console.error(`Root ID ${this.rootId} tidak ditemukan!`);
    }
  }

  destroy() {
    this.unmount();
    
    if (this.dom) {
      this.dom.querySelectorAll('*').forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.onclick = null;
        htmlEl.oninput = null;
        htmlEl.onchange = null;
      });
    }

    this.registry = {};
    this.proxy = {} as T;
    this.programs = {};
    this.pendingDiff.clear();
    this.dom = null;
    this.hooks.destroy.forEach(fn => fn());
    this.hooks = { mount: [], unmount: [], remount: [], destroy: [] };
  }
}

export default HTMP;