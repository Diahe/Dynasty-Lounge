/* Dynasty Lounge — крошечный рендерер шаблонов (замена редакторского рантайма для статического хостинга) */
(function () {
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(patch) { Object.assign(this.state, patch); schedule(); }
  }
  window.DCLogic = DCLogic;

  var root, tpl, comp, queued = false, first = true;

  function lookup(path, scopes) {
    var parts = path.trim().split('.');
    for (var i = scopes.length - 1; i >= 0; i--) {
      if (scopes[i] && Object.prototype.hasOwnProperty.call(scopes[i], parts[0])) {
        var v = scopes[i][parts[0]];
        for (var k = 1; k < parts.length; k++) v = v == null ? undefined : v[parts[k]];
        return v;
      }
    }
    if (parts[0] === 'true') return true;
    if (parts[0] === 'false') return false;
    return undefined;
  }
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  function interp(str, scopes) {
    return str.replace(HOLE, function (_, p) { var v = lookup(p, scopes); return v == null ? '' : String(v); });
  }

  function build(src, scopes, out) {
    src.childNodes.forEach(function (n) {
      if (n.nodeType === 3) { out.appendChild(document.createTextNode(interp(n.nodeValue, scopes))); return; }
      if (n.nodeType !== 1) return;
      if (n.tagName === 'TEMPLATE' && n.hasAttribute('data-for')) {
        var list = lookup(n.getAttribute('data-for'), scopes) || [];
        var as = n.getAttribute('data-as');
        list.forEach(function (item, i) {
          var s = {}; s[as] = item; s[as + 'Index'] = i;
          build(n.content, scopes.concat([s]), out);
        });
        return;
      }
      if (n.tagName === 'TEMPLATE' && n.hasAttribute('data-if')) {
        if (lookup(n.getAttribute('data-if'), scopes)) build(n.content, scopes, out);
        return;
      }
      var el = document.createElement(n.tagName.toLowerCase());
      for (var a = 0; a < n.attributes.length; a++) {
        var at = n.attributes[a];
        if (at.name === 'data-on-click') {
          var fn = lookup(at.value, scopes);
          if (typeof fn === 'function') el.addEventListener('click', fn);
          continue;
        }
        if (at.name === 'defaultvalue') { el.setAttribute('data-default', interp(at.value, scopes)); continue; }
        el.setAttribute(at.name, interp(at.value, scopes));
      }
      build(n.tagName === 'TEMPLATE' ? n.content : n, scopes, el);
      out.appendChild(el);
    });
  }

  function render() {
    queued = false;
    var saved = {};
    root.querySelectorAll('[data-key]').forEach(function (f) {
      saved[f.getAttribute('data-key')] = f.type === 'checkbox' ? f.checked : f.value;
    });
    var vals = comp.renderVals();
    var frag = document.createDocumentFragment();
    build(tpl.content, [vals], frag);
    frag.querySelectorAll('[data-default]').forEach(function (f) {
      if (f.tagName === 'SELECT') f.value = f.getAttribute('data-default');
      else f.value = f.getAttribute('data-default');
    });
    if (!first) frag.querySelectorAll('[data-key]').forEach(function (f) {
      var k = f.getAttribute('data-key');
      if (k in saved) { if (f.type === 'checkbox') f.checked = saved[k]; else f.value = saved[k]; }
    });
    root.replaceChildren(frag);
    first = false;
    if (window.DCAfterRender) window.DCAfterRender(root, comp);
  }
  function schedule() { if (!queued) { queued = true; Promise.resolve().then(render); } }

  window.DCMount = function (Component) {
    root = document.getElementById('app');
    tpl = document.getElementById('tpl');
    comp = new Component({});
    render();
  };
})();
