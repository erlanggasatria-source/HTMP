const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>');
const { window } = dom;

global.window = window;
global.document = window.document;
global.DOMParser = window.DOMParser;
global.Node = window.Node;
global.Element = window.Element;
global.HTMLElement = window.HTMLElement;
global.HTMLInputElement = window.HTMLInputElement;
global.HTMLTextAreaElement = window.HTMLTextAreaElement;
global.HTMLSelectElement = window.HTMLSelectElement;
global.Text = window.Text;

const HTMP = require('../dist/cjs/index.js').default;

function assert(name, condition, detail) {
  if (!condition) {
    throw new Error(`${name}: ${detail}`);
  }
}

const app1 = new HTMP('root', '<div><p>{{ user.name }}</p><ul><li :for="item in items">{{ item.label }}</li></ul><input :value="user.name" /></div>');
app1.setProxy({ user: { name: 'Alice' }, items: [{ label: 'One' }, { label: 'Two' }] });
app1.mount();

assert('text binding', document.querySelector('p').textContent.trim() === 'Alice', 'text should render initial value');
app1.proxy.user.name = 'Bob';
assert('nested object update', document.querySelector('p').textContent.trim() === 'Bob', 'nested update should refresh text');
app1.proxy.items.push({ label: 'Three' });
assert('list append', Array.from(document.querySelectorAll('li')).map(n => n.textContent).join(',') === 'One,Two,Three', 'list should append item');
app1.proxy.items = [{ label: 'C' }, { label: 'B' }, { label: 'A' }];
assert('list reorder', Array.from(document.querySelectorAll('li')).map(n => n.textContent).join(',') === 'C,B,A', 'list should reorder according to array');
app1.proxy.items.splice(1, 1);
assert('list remove', Array.from(document.querySelectorAll('li')).map(n => n.textContent).join(',') === 'C,A', 'list should remove item and keep order');
app1.proxy.items[0].label = 'X';
assert('nested item update', Array.from(document.querySelectorAll('li')).map(n => n.textContent).join(',') === 'X,A', 'nested item property should re-render');

const app2 = new HTMP('root', '<div><span>{{ user.profile.name }}</span><input :value="user.profile.name" /><button @click="saveUser">Save</button></div>');
app2.setProxy({ user: { profile: { name: 'Alice' } } });
app2.setProgram('saveUser', () => { app2.proxy.user.profile.name = 'Bob'; });
app2.mount();
app2.proxy.user.profile.name = 'Charlie';
assert('nested deep input', document.querySelector('input').value === 'Charlie', 'deep nested input should update');
app2.proxy.user.profile.name = 'Dana';
document.querySelector('button').click();
assert('program update', document.querySelector('input').value === 'Bob', 'program should mutate state and refresh');

const app3 = new HTMP('root', '<div><input :value="form.title" /><textarea :value="form.note"></textarea><select :value="form.role"><option value="admin">Admin</option><option value="user">User</option></select></div>');
app3.setProxy({ form: { title: 'Lead', note: 'Initial note', role: 'admin' } });
app3.mount();
assert('root input value', document.querySelector('input').value === 'Lead', 'root input should render initial value');
assert('root textarea value', document.querySelector('textarea').value === 'Initial note', 'root textarea should render initial value');
assert('root select value', document.querySelector('select').value === 'admin', 'root select should render initial value');
app3.proxy.form.title = 'Manager';
app3.proxy.form.note = 'Updated note';
app3.proxy.form.role = 'user';
assert('root input update', document.querySelector('input').value === 'Manager', 'root input should update from proxy');
assert('root textarea update', document.querySelector('textarea').value === 'Updated note', 'root textarea should update from proxy');
assert('root select update', document.querySelector('select').value === 'user', 'root select should update from proxy');

// ==========================================
// TEST 4: Smart Event Arguments, Boolean Attributes & Select Value
// ==========================================
const app4 = new HTMP('root', `
  <div>
    <input id="test-input" @input="updateField(e, 'email')" :disabled="isLocked" />
    <select id="test-select" :value="role">
      <option value="admin">Admin</option>
      <option value="user">User</option>
    </select>
  </div>
`);

let capturedEvent = null;
let capturedParam = null;

app4.setProxy({
  isLocked: true,
  role: 'user'
});

app4.setProgram({
  updateField: (e, paramName) => {
    capturedEvent = e;
    capturedParam = paramName;
  }
});

app4.mount();

// Test 4A: Boolean Attribute (:disabled)
assert('boolean attribute true', document.querySelector('#test-input').hasAttribute('disabled') === true, 'disabled should be present when true');
app4.proxy.isLocked = false;
assert('boolean attribute false', document.querySelector('#test-input').hasAttribute('disabled') === false, 'disabled should be removed when false');

// Test 4B: Smart Event Arguments (@input with e and string)
const testInput = document.querySelector('#test-input');
testInput.value = 'test@example.com';
testInput.dispatchEvent(new window.Event('input'));

assert('event argument passed', capturedEvent !== null && capturedEvent.target !== undefined, 'should pass the native Event object');
assert('string argument passed', capturedParam === 'email', 'should pass string literal "email" correctly');

// Test 4C: Select Value Binding
const testSelect = document.querySelector('#test-select');
assert('select initial value', testSelect.value === 'user', 'select should render initial proxy value');
app4.proxy.role = 'admin';
assert('select reactive update', testSelect.value === 'admin', 'select should update value when proxy changes');

// ==========================================
// TEST 5: Nested :for (Multi-level Hierarchy)
// ==========================================
const app5 = new HTMP('root', `
  <div>
    <ul>
      <li :for="menu in menus">
        <span class="menu-name">{{ menu.label }}</span>
        <ul>
          <li :for="child in menu.children">
            <span class="child-name">{{ child.label }}</span>
            <ul>
              <li :for="sub in child.children">
                <span class="sub-name">{{ sub.label }}</span>
              </li>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </div>
`);

app5.setProxy({
  menus: [
    {
      label: 'Dashboard',
      children: [
        { label: 'v1', children: [{ label: 'v1-a' }, { label: 'v1-b' }] },
        { label: 'v2', children: [] }
      ]
    },
    { label: 'Starter', children: [] }
  ]
});

app5.mount();

// Helper: cek apakah elemen tersembunyi (display:none) oleh placeholder
function isVisible(el) {
  let cur = el;
  while (cur && cur.nodeType === 1) {
    if (cur.style && cur.style.display === 'none') return false;
    cur = cur.parentElement;
  }
  return true;
}
function visibleNames(selector) {
  return Array.from(document.querySelectorAll(selector))
    .filter(isVisible)
    .map(n => n.textContent.trim());
}
// Helper baru: ambil elemen visible pertama (untuk diklik)
function getFirstVisible(selector) {
  return Array.from(document.querySelectorAll(selector)).find(isVisible);
}

// Test 5A: Level 1 (root menus)
const menuNames = visibleNames('.menu-name');
assert('nested level1 count', menuNames.join(',') === 'Dashboard,Starter', `level1 should render 2 menus, got ${menuNames.join(',')}`);

// Test 5B: Level 2 (children)
const childNames = visibleNames('.child-name');
assert('nested level2 count', childNames.join(',') === 'v1,v2', `level2 should render children, got ${childNames.join(',')}`);

// Test 5C: Level 3 (sub-children)
const subNames = visibleNames('.sub-name');
assert('nested level3 count', subNames.join(',') === 'v1-a,v1-b', `level3 should render only v1's children, got ${subNames.join(',')}`);

// Test 5D: Empty children array renders nothing
const starterLi = Array.from(document.querySelectorAll('li')).find(li => {
  const span = li.querySelector('.menu-name');
  return span && span.textContent.trim() === 'Starter';
});
const starterSubItems = starterLi ? Array.from(starterLi.querySelectorAll('ul li')).filter(isVisible).length : -1;
assert('empty children no items', starterSubItems === 0, `Starter (empty children) should render no sub-items, got ${starterSubItems}`);

// Test 5E: Reactive update on nested data
app5.proxy.menus[0].children[0].children.push({ label: 'v1-c' });
const subNamesAfter = visibleNames('.sub-name');
assert('nested reactive append', subNamesAfter.join(',') === 'v1-a,v1-b,v1-c', `nested append should re-render, got ${subNamesAfter.join(',')}`);


// ==========================================
// TEST 6: Event Handlers in Nested :for
// ==========================================
let clickedMenu = null;
let clickedChild = null;
let clickedSub = null;

const app6 = new HTMP('root', `
  <div>
    <ul>
      <li :for="menu in menus">
        <button class="btn-menu" @click="onMenu(menu)">{{ menu.label }}</button>
        <ul>
          <li :for="child in menu.children">
            <button class="btn-child" @click="onChild(child)">{{ child.label }}</button>
            <ul>
              <li :for="sub in child.children">
                <button class="btn-sub" @click="onSub(sub)">{{ sub.label }}</button>
              </li>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </div>
`);

app6.setProxy({
  menus: [
    {
      label: 'Root',
      children: [
        { label: 'Child', children: [{ label: 'Sub' }] }
      ]
    }
  ]
});

app6.setProgram({
  onMenu: (m) => { clickedMenu = m; },
  onChild: (c) => { clickedChild = c; },
  onSub: (s) => { clickedSub = s; }
});

app6.mount();

// Gunakan getFirstVisible agar tidak mengklik tombol di dalam template display:none
getFirstVisible('.btn-menu').click();
assert('event level1 item', clickedMenu && clickedMenu.label === 'Root', 'level1 event should receive menu item');

getFirstVisible('.btn-child').click();
assert('event level2 item', clickedChild && clickedChild.label === 'Child', 'level2 event should receive child item');

getFirstVisible('.btn-sub').click();
assert('event level3 item', clickedSub && clickedSub.label === 'Sub', 'level3 event should receive sub item');

console.log('ALL_SMOKE_TESTS_PASSED');
