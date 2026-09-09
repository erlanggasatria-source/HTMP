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

const app4 = new HTMP('root', '<div><input :value="form.title" /></div>');
app4.setProxy({ form: { title: 'Draft' } });
app4.mount();
const liveInput = document.querySelector('input');
liveInput.focus();
liveInput.value = 'typing';
app4.proxy.form.title = 'stale external update';
assert('focused input stays stable while editing', liveInput.value === 'typing', 'typing input should not be overwritten while focused');

console.log('ALL_SMOKE_TESTS_PASSED');
