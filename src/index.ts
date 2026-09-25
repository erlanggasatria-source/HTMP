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

// FIX: Gunakan intersection type (&) bukan interface extends
type HtmpBinding = RegistryBinding & { _htmpId?: number };

export class HTMP<T extends Record<string, any> = Record<string, any>> {
  private rootId: string;
  private parser: DOMParser;
  public proxy: T;
  private dom: Element | null;
  public programs: Record<string, ProgramCallback>;
  private registry: Record<string, HtmpBinding[]>;
  private pendingDiff: Set<string>;
  public isMounted: boolean;
  
  private _htmpIdCounter: number = 0;

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
        
    if (this.dom) {
      (this.dom as any)._htmp = "root";
    }

    this.programs = {};
    this.registry = Object.create(null) as Record<string, HtmpBinding[]>;
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
        
        const htmpId = this._htmpIdCounter++;
        (node as any)._htmp = htmpId;

        rootKeys.forEach(key => {
          if (!this.registry[key]) this.registry[key] = [];
          this.registry[key].push({
            type: 'text',
            path: [...currentPath],
            rawText,
            rawMatch,
            expr,
            _htmpId: htmpId
          });
        });
      }
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      let isListTemplate = false;
      let loopItemName = '';
      
      for (const attr of Array.from((node as Element).attributes)) {
        if (attr.name === ':for') {
          const m = attr.value.match(/(\w+)\s+in\s+(.*)/);
          if (m) loopItemName = m[1];
          isListTemplate = true;
        }
      }

      const htmpId = this._htmpIdCounter++;
      (node as Element as any)._htmp = htmpId;

      for (const attr of Array.from((node as Element).attributes)) {
        if (attr.name.startsWith('@')) {
          if (!isListTemplate) {
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
          }
          (node as Element).removeAttribute(attr.name);
        }
        else if (attr.name.startsWith(':') && attr.name !== ':for') {
          if (!isListTemplate) {
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
                attrExpr: expr,
                _htmpId: htmpId
              });
            });
          }
          (node as Element).removeAttribute(attr.name);
        }
        else if (attr.name === ':for') {
          const match = attr.value.match(/(\w+)\s+in\s+(.*)/);
          if (match) {
            const itemName = match[1];
            const listExpr = match[2].trim();
            
            const isRootList = /^[\w$]+$/.test(listExpr);
            
            if (isRootList) {
              const listKey = listExpr;
              const originalHTML = (node as Element).outerHTML;
              const innerHTML = (node as Element).innerHTML;
              
              const listBinding: ListBinding = {
                type: 'list',
                templateNode: node as Element,
                parentEl: node.parentNode as Element,
                itemName,
                listKey,
                originalHTML
              };
              
              if (!this.registry[listKey]) this.registry[listKey] = [];
              this.registry[listKey].push(listBinding);
              
              const nestedForMatches = [...innerHTML.matchAll(/:for="(\w+)\s+in\s+.*?"/g)];
              const nestedItemNames = new Set(nestedForMatches.map(m => m[1]));
              nestedItemNames.add(itemName);
              
              const regexText = /\{\{\s*(.*?)\s*\}\}/g;
              const regexAttr = /:(?!for)\w+="([^"]+)"/g;
              const allExprs: string[] = [];
              let m;
              
              while ((m = regexText.exec(innerHTML)) !== null) allExprs.push(m[1]);
              while ((m = regexAttr.exec(innerHTML)) !== null) allExprs.push(m[1]);
              
              const rootKeysInLoop = new Set<string>();
              allExprs.forEach(expr => {
                 const cleanExpr = expr.replace(/'[^']*'|"[^"]*"/g, '');
                 const vars = cleanExpr.match(/[a-zA-Z_][a-zA-Z0-9_.]*/g) || [];
                 vars.forEach(v => {
                   const rootKey = v.split('.')[0];
                   if (!nestedItemNames.has(rootKey)) {
                     rootKeysInLoop.add(rootKey);
                   }
                 });
              });

              rootKeysInLoop.forEach(key => {
                if (!this.registry[key]) this.registry[key] = [];
                this.registry[key].push(listBinding);
              });
            }
            
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

  private resolveNode(key: string, binding: HtmpBinding): Node | null {
    if (!this.dom) return null;
    
    let targetNode: Node | null = this.dom;
    
    if ('path' in binding && binding.path) {
      for (const index of binding.path) {
        if (targetNode && targetNode.childNodes[index]) {
          targetNode = targetNode.childNodes[index];
        } else {
          targetNode = null;
          break;
        }
      }

      if (targetNode && (targetNode as any)._htmp === binding._htmpId) {
        return targetNode;
      }
    }

    if (binding._htmpId !== undefined) {
      const foundNode = this.findNodeByHtmpId(this.dom, binding._htmpId);

      if (foundNode) {
        const newPath = this.getRelativeDOMPath(foundNode, this.dom);
        if ('path' in binding) {
          binding.path = newPath;
        }
        console.info(`[HTMP] Self-healing: Path corrected for ID ${binding._htmpId}`);
        return foundNode;
      }
    }

    console.warn(`[HTMP Warn] Reactive node ID ${binding._htmpId} not found. Removed from registry.`);
    this.removeBinding(key, binding);
    return null;
  }

  private findNodeByHtmpId(root: Node, id: number): Node | null {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL, {
      acceptNode: function(node) {
        if ((node as any)._htmp === id) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    });
    return walker.nextNode();
  }

  private getRelativeDOMPath(target: Node, root: Node): number[] {
    const path: number[] = [];
    let current: Node | null = target;
    
    while (current !== null && current !== root) {
      const parent: Node | null = current.parentNode;
      if (parent === null) break;
      
      const index: number = Array.prototype.indexOf.call(parent.childNodes, current);
      path.unshift(index);
      current = parent;
    }
    return path;
  }

  private removeBinding(key: string, bindingToRemove: HtmpBinding) {
    if (this.registry[key]) {
      this.registry[key] = this.registry[key].filter(b => b !== bindingToRemove);
      if (this.registry[key].length === 0) {
        delete this.registry[key];
      }
    }
  }  

  renderDiff() {
    if (this.pendingDiff.size === 0 || !this.dom) return;
    
    this.pendingDiff.forEach((key: string) => {
      if (this.registry[key]) {
        [...this.registry[key]].forEach((binding: HtmpBinding) => {
          if (binding.type === 'list') this.renderList(binding);
          else if (binding.type === 'text') this.renderText(key, binding);
          else if (binding.type === 'attribute') this.renderAttribute(key, binding);
        });
      }
    });
    this.pendingDiff.clear();
  }

  // === GLOBAL EXPRESSION EVALUATOR (v1.2.0) ===
  // expresion pure JavaScript in {{ }} atau :
  private evalExpr(expr: string, proxyKeys: string[], itemName?: string, item?: any, parentItemName?: string, parentItem?: any): any {
    const strings: string[] = [];
    // Masking string literal agar tidak rusak oleh regex
    let maskedExpr = expr.replace(/'[^']*'|"[^"]*"/g, (match) => {
      strings.push(match);
      return `__STR_${strings.length - 1}__`;
    });

    let finalExpr = maskedExpr;
        
    proxyKeys.forEach(k => {
      finalExpr = finalExpr.replace(new RegExp(`(?<![\\w.])${k}\\b`, 'g'), `proxy.${k}`);
    });
    
    if (itemName && item !== undefined) {
      finalExpr = finalExpr.replace(new RegExp(`(?<![\\w.])${itemName}\\b`, 'g'), 'item');
    }
    
    if (parentItemName && parentItem !== undefined) {
      finalExpr = finalExpr.replace(new RegExp(`(?<![\\w.])${parentItemName}\\b`, 'g'), 'parentItem');
    }
    
    finalExpr = finalExpr.replace(/__STR_(\d+)__/g, (_m, idx) => strings[parseInt(idx)]);

    try {
      if (item !== undefined) {
        const func = new Function('proxy', 'item', 'parentItem', `return ${finalExpr};`);
        return func(this.proxy, item, parentItem);
      } else {
        const func = new Function('proxy', `return ${finalExpr};`);
        return func(this.proxy);
      }
    } catch(e) {     
      return undefined; 
    }
  }

  renderText(key: string, binding: Extract<HtmpBinding, { type: 'text' }>): void {
    const targetNode = this.resolveNode(key, binding);
    if (!targetNode || targetNode.nodeType !== Node.TEXT_NODE) return;
    
    const textNode = targetNode as Text;
    const rawText = binding.rawText;
    
    const proxyKeys = Object.keys(this.proxy);
    
    const newText = rawText.replace(/\{\{\s*(.*?)\s*\}\}/g, (_match: string, expr: string) => {
      // Gunakan evalExpr universal
      const val = this.evalExpr(expr, proxyKeys);
      return val !== undefined && val !== null ? String(val) : '';
    });
    
    if (textNode.nodeValue !== newText) {
      textNode.nodeValue = newText;
    }
  }

  renderAttribute(key: string, binding: Extract<HtmpBinding, { type: 'attribute' }>): void {
    const targetNode = this.resolveNode(key, binding);
    if (!targetNode || targetNode.nodeType !== Node.ELEMENT_NODE) return;
    
    const el = targetNode as Element;
    const proxyKeys = Object.keys(this.proxy);
    
    // Gunakan evalExpr universal
    let val = this.evalExpr(binding.attrExpr, proxyKeys);
    
    const realAttrName = binding.attrName;
    const strVal = String(val);

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

  renderList(binding: ListBinding, explicitItems?: unknown[], parentItem?: unknown, parentItemName?: string): void {
    const items = explicitItems || (Array.isArray(this.proxy[binding.listKey]) ? this.proxy[binding.listKey] as unknown[] : []);
    const { templateNode, parentEl, itemName, originalHTML } = binding; 
    if (!parentEl) return;
    
    const actualParent = parentEl;
    const newKeys = new Set<string>();
    
    const wrapper = document.createElement('template');
    wrapper.innerHTML = originalHTML;
    const freshTemplate = wrapper.content.firstElementChild as Element;
        
    freshTemplate.removeAttribute(':for');    

    const proxyKeys = Object.keys(this.proxy);
        
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
        this.processListItem(childNode, freshTemplate, item, itemName, proxyKeys, true, parentItem, parentItemName);
      } else {
        this.processListItem(childNode, freshTemplate, item, itemName, proxyKeys, false, parentItem, parentItemName);
      }
    });
    
    for (let i = actualParent.children.length - 1; i >= 0; i--) {
      const node = actualParent.children[i];
      if (node.id.startsWith(`${binding.listKey}-`) && !newKeys.has(node.id)) {
        actualParent.removeChild(node);
      }
    }
  }

  processListItem(
    clonedNode: Node, 
    templateNode: Node, 
    item: unknown, 
    itemName: string, 
    proxyKeys: string[],
    isFirstRender: boolean,
    parentItem?: unknown,
    parentItemName?: string
  ): void {
    if (clonedNode.nodeType === Node.TEXT_NODE && templateNode.nodeType === Node.TEXT_NODE) {
      const tNode = templateNode as Text;
      const cNode = clonedNode as Text;
      const rawText = tNode.nodeValue || '';
      const newVal = rawText.replace(/\{\{\s*(.*?)\s*\}\}/g, (_match, expr) => {
        // Gunakan evalExpr dengan parameter item & parentItem
        const val = this.evalExpr(expr, proxyKeys, itemName, item, parentItemName, parentItem);
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
        if (attr.name === ':for') {
          const match = attr.value.match(/(\w+)\s+in\s+(.*)/);
          if (match) {
            const innerItemName = match[1];
            const innerListExpr = match[2];
            
            if (parentItemName && innerItemName === parentItemName) {
              console.warn(
                `[HTMP Warn] Variable name "${innerItemName}" nested :for collide with parent scope. ` +
                `Use unique name instead to avoid shadowing variable.`
              );
            }
            
            // Evaluasi array anak menggunakan evalExpr
            let childItems = this.evalExpr(innerListExpr, proxyKeys, itemName, item, parentItemName, parentItem);
            if (!Array.isArray(childItems)) {
              childItems = [];
            }
            
            const innerParentEl = cEl.parentNode as Element;
            if (innerParentEl) {              
              (cEl as HTMLElement).style.display = 'none';
              
              const cleanTemplate = tEl.cloneNode(true) as Element;
              cleanTemplate.removeAttribute(':for');
              
              const parentId = (item as any)?.id !== undefined ? (item as any).id : 'root';
              const nestedBinding: ListBinding = {
                type: 'list',
                templateNode: cleanTemplate,
                parentEl: innerParentEl,
                itemName: innerItemName,
                listKey: `${itemName}-${parentId}-children`, 
                originalHTML: cleanTemplate.outerHTML
              };
                            
              this.renderList(nestedBinding, childItems as unknown[], item, itemName);
            }
          }
          return; 
        }  
                
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
                  if (typeof parentItemName !== 'undefined' && token === parentItemName) return parentItem;
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
          
          // Gunakan evalExpr untuk evaluasi atribut di dalam loop
          const val = this.evalExpr(expr, proxyKeys, itemName, item, parentItemName, parentItem);

          if (realAttrName === 'value' && (cEl.tagName === 'INPUT' || cEl.tagName === 'TEXTAREA' || cEl.tagName === 'SELECT')) {
            const strVal = String(val);
            if ((cEl as HTMLInputElement).value !== strVal) {
              (cEl as HTMLInputElement).value = strVal;
            }
            
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
          else if (val === false || val === null || val === undefined) {
            cEl.removeAttribute(realAttrName);
          } else if (val === true) {
            cEl.setAttribute(realAttrName, '');
          } 
          else {
            cEl.setAttribute(realAttrName, String(val));
          }        
          if (isFirstRender) cEl.removeAttribute(attr.name);
        }
      }

      const cChildren = Array.from(cEl.childNodes);
      const tChildren = Array.from(tEl.childNodes);
      for (let i = 0; i < cChildren.length; i++) {
        if (tChildren[i]) {
          this.processListItem(cChildren[i], tChildren[i], item, itemName, proxyKeys, isFirstRender, parentItem, parentItemName);
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
      
      Object.values(this.registry).flat().forEach((b: HtmpBinding) => {
        if (b.type === 'list' && b.templateNode.parentNode) {
          b.templateNode.parentNode.removeChild(b.templateNode);
        }
      });

      this.isMounted = true;
      
      const registeredKeys = Object.keys(this.registry);
      const proxyKeys = Object.keys(this.proxy);
            
      const nativeGlobals = new Set([
        ...Object.getOwnPropertyNames(window),
        ...Object.getOwnPropertyNames(Object.prototype),
        'toLocaleString', 'toFixed', 'toString', 'parseInt', 'parseFloat', 'Math', 'Date', 'JSON', 'gt', 'lt' // Tambahkan jika perlu
      ]);
      
      registeredKeys.forEach(key => {        
        if (!proxyKeys.includes(key) && !nativeGlobals.has(key)) {
          console.warn(`[HTMP Warn] Variabel "${key}" use in template, but proxy not.`);
        }
      });      

      this.renderDiff();
      this.hooks.mount.forEach(fn => fn());
    } else {
      console.error(`Root ID ${this.rootId} not found!`);
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
      console.error(`Root ID ${this.rootId} not found!`);
    }
  }

  destroy() {
    this.unmount();
    
    if (this.dom) {
      this.dom.querySelectorAll('*').forEach((el: Element) => {
        const htmlEl = el as HTMLElement;        
        for (const key in htmlEl) {
          if (key.startsWith('on') && typeof (htmlEl as any)[key] === 'function') {
            (htmlEl as any)[key] = null;
          }
        }
      });

      const rootHtmlEl = this.dom as HTMLElement;
      for (const key in rootHtmlEl) {
        if (key.startsWith('on') && typeof (rootHtmlEl as any)[key] === 'function') {
          (rootHtmlEl as any)[key] = null;
        }
      }
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