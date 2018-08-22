function constant(x) {
  return function() {
    return x;
  };
}

function canvas(width, height) {
  var canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function context2d(width, height, dpi) {
  if (dpi == null) dpi = devicePixelRatio;
  var canvas = document.createElement("canvas");
  canvas.width = width * dpi;
  canvas.height = height * dpi;
  canvas.style.width = width + "px";
  var context = canvas.getContext("2d");
  context.scale(dpi, dpi);
  return context;
}

function download(object, name, label) {
  var a = document.createElement("a"),
      b = a.appendChild(document.createElement("button"));
  b.textContent = label == null ? "Download" : label;
  a.download = name == null ? "untitled" : name;
  a.onclick = function() {
    var url = a.href = URL.createObjectURL(object);
    setTimeout(function() { URL.revokeObjectURL(url); }, 50);
  };
  return a;
}

var namespaces = {
  math: "http://www.w3.org/1998/Math/MathML",
  svg: "http://www.w3.org/2000/svg",
  xhtml: "http://www.w3.org/1999/xhtml",
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};

function element(name, attributes) {
  var prefix = name += "", i = prefix.indexOf(":"), value;
  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
  var element = namespaces.hasOwnProperty(prefix)
      ? document.createElementNS(namespaces[prefix], name)
      : document.createElement(name);
  if (attributes) for (var key in attributes) {
    prefix = key, i = prefix.indexOf(":"), value = attributes[key];
    if (i >= 0 && (prefix = key.slice(0, i)) !== "xmlns") key = key.slice(i + 1);
    if (namespaces.hasOwnProperty(prefix)) element.setAttributeNS(namespaces[prefix], key, value);
    else element.setAttribute(key, value);
  }
  return element;
}

function input(type) {
  var input = document.createElement("input");
  if (type != null) input.type = type;
  return input;
}

function range(min, max, step) {
  if (arguments.length === 1) max = min, min = null;
  var input = document.createElement("input");
  input.min = min = min == null ? 0 : +min;
  input.max = max = max == null ? 1 : +max;
  input.step = step == null ? "any" : step = +step;
  input.type = "range";
  return input;
}

function select(values) {
  var select = document.createElement("select");
  Array.prototype.forEach.call(values, function(value) {
    var option = document.createElement("option");
    option.value = option.textContent = value;
    select.appendChild(option);
  });
  return select;
}

function svg(width, height) {
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", [0, 0, width, height]);
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  return svg;
}

function text(value) {
  return document.createTextNode(value);
}

var count = 0;

function uid(name) {
  return new Id("O-" + (name == null ? "" : name + "-") + ++count);
}

function Id(id) {
  this.id = id;
  this.href = window.location.href + "#" + id;
}

Id.prototype.toString = function() {
  return "url(" + this.href + ")";
};

var DOM = {
  canvas: canvas,
  context2d: context2d,
  download: download,
  element: element,
  input: input,
  range: range,
  select: select,
  svg: svg,
  text: text,
  uid: uid
};

function buffer(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader;
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function text$1(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader;
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function url(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader;
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

var Files = {
  buffer: buffer,
  text: text$1,
  url: url
};

function that() {
  return this;
}

function disposable(value, dispose) {
  let done = false;
  return {
    [Symbol.iterator]: that,
    next: () => done ? {done: true} : (done = true, {done: false, value}),
    return: () => (done = true, dispose(value), {done: true}),
    throw: () => ({done: done = true})
  };
}

function* filter(iterator, test) {
  var result, index = -1;
  while (!(result = iterator.next()).done) {
    if (test(result.value, ++index)) {
      yield result.value;
    }
  }
}

function observe(initialize) {
  let stale = false;
  let value;
  let resolve;
  const dispose = initialize(change);

  function change(x) {
    if (resolve) resolve(x), resolve = null;
    else stale = true;
    return value = x;
  }

  function next() {
    return {done: false, value: stale
        ? (stale = false, Promise.resolve(value))
        : new Promise(_ => (resolve = _))};
  }

  return {
    [Symbol.iterator]: that,
    throw: () => ({done: true}),
    return: () => (dispose != null && dispose(), {done: true}),
    next
  };
}

function input$1(input) {
  return observe(function(change) {
    var event = eventof(input), value = valueof(input);
    function inputted() { change(valueof(input)); }
    input.addEventListener(event, inputted);
    if (value !== undefined) change(value);
    return function() { input.removeEventListener(event, inputted); };
  });
}

function valueof(input) {
  switch (input.type) {
    case "range":
    case "number": return input.valueAsNumber;
    case "date": return input.valueAsDate;
    case "checkbox": return input.checked;
    case "file": return input.multiple ? input.files : input.files[0];
    default: return input.value;
  }
}

function eventof(input) {
  switch (input.type) {
    case "button":
    case "submit":
    case "checkbox": return "click";
    case "file": return "change";
    default: return "input";
  }
}

function* map(iterator, transform) {
  var result, index = -1;
  while (!(result = iterator.next()).done) {
    yield transform(result.value, ++index);
  }
}

function queue(initialize) {
  let resolve;
  const queue = [];
  const dispose = initialize(push);

  function push(x) {
    queue.push(x);
    if (resolve) resolve(queue.shift()), resolve = null;
    return x;
  }

  function next() {
    return {done: false, value: queue.length
        ? Promise.resolve(queue.shift())
        : new Promise(_ => (resolve = _))};
  }

  return {
    [Symbol.iterator]: that,
    throw: () => ({done: true}),
    return: () => (dispose != null && dispose(), {done: true}),
    next
  };
}

function* range$1(start, stop, step) {
  start = +start;
  stop = +stop;
  step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;
  var i = -1, n = Math.max(0, Math.ceil((stop - start) / step)) | 0;
  while (++i < n) {
    yield start + i * step;
  }
}

function valueAt(iterator, i) {
  if (!isFinite(i = +i) || i < 0 || i !== i | 0) return;
  var result, index = -1;
  while (!(result = iterator.next()).done) {
    if (++index === i) {
      return result.value;
    }
  }
}

function worker(source) {
  const url = URL.createObjectURL(new Blob([source], {type: "text/javascript"}));
  const worker = new Worker(url);
  return disposable(worker, () => {
    worker.terminate();
    URL.revokeObjectURL(url);
  });
}

var Generators = {
  disposable: disposable,
  filter: filter,
  input: input$1,
  map: map,
  observe: observe,
  queue: queue,
  range: range$1,
  valueAt: valueAt,
  worker: worker
};

function template(render, wrapper) {
  return function(strings) {
    var string = strings[0],
        parts = [], part,
        root = null,
        node, nodes,
        walker,
        i, n, j, m, k = -1;

    // Concatenate the text using comments as placeholders.
    for (i = 1, n = arguments.length; i < n; ++i) {
      part = arguments[i];
      if (part instanceof Node) {
        parts[++k] = part;
        string += "<!--o:" + k + "-->";
      } else if (Array.isArray(part)) {
        for (j = 0, m = part.length; j < m; ++j) {
          node = part[j];
          if (node instanceof Node) {
            if (root === null) {
              parts[++k] = root = document.createDocumentFragment();
              string += "<!--o:" + k + "-->";
            }
            root.appendChild(node);
          } else {
            root = null;
            string += node;
          }
        }
        root = null;
      } else {
        string += part;
      }
      string += strings[i];
    }

    // Render the text.
    root = render(string);

    // Walk the rendered content to replace comment placeholders.
    if (++k > 0) {
      nodes = new Array(k);
      walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT, null, false);
      while (walker.nextNode()) {
        node = walker.currentNode;
        if (/^o:/.test(node.nodeValue)) {
          nodes[+node.nodeValue.slice(2)] = node;
        }
      }
      for (i = 0; i < k; ++i) {
        if (node = nodes[i]) {
          node.parentNode.replaceChild(parts[i], node);
        }
      }
    }

    // Is the rendered content
    // & a parent of a single child? Detach and return the child.
    // & a document fragment? Replace the fragment with an element.
    // & some other node? Return it.
    return root.childNodes.length === 1 ? root.removeChild(root.firstChild)
        : root.nodeType === 11 ? ((node = wrapper()).appendChild(root), node)
        : root;
  };
}

var html = template(function(string) {
  var template$$1 = document.createElement("template");
  template$$1.innerHTML = string.trim();
  return document.importNode(template$$1.content, true);
}, function() {
  return document.createElement("div");
});

function md(require) {
  return function() {
    return require("marked@0.3.12/marked.min.js").then(function(marked) {
      return template(function(string) {
        var root = document.createElement("div");
        root.innerHTML = marked(string, {langPrefix: ""}).trim();
        var code = root.querySelectorAll("pre code[class]");
        if (code.length > 0) require("@observablehq/highlight.js@1.0.0/highlight.min.js").then(function(hl) { code.forEach(hl.highlightBlock); });
        return root;
      }, function() {
        return document.createElement("div");
      });
    });
  };
}

function Mutable(value) {
  let change;
  Object.defineProperties(this, {
    generator: {value: observe(_ => void (change = _))},
    value: {get: () => value, set: x => change(value = x)}
  });
  if (value !== undefined) change(value);
}

function* now() {
  while (true) {
    yield Date.now();
  }
}

function delay(duration, value) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve(value);
    }, duration);
  });
}

var timeouts = new Map;

function timeout(now, time) {
  var t = new Promise(function(resolve) {
    timeouts.delete(time);
    var delay = time - now;
    if (!(delay > 0)) throw new Error("invalid time");
    if (delay > 0x7fffffff) throw new Error("too long to wait");
    setTimeout(resolve, delay);
  });
  timeouts.set(time, t);
  return t;
}

function when(time, value) {
  var now;
  return (now = timeouts.get(time = +time)) ? now.then(constant(value))
      : (now = Date.now()) >= time ? Promise.resolve(value)
      : timeout(now, time).then(constant(value));
}

function tick(duration, value) {
  return when(Math.ceil((Date.now() + 1) / duration) * duration, value);
}

var Promises = {
  delay: delay,
  tick: tick,
  when: when
};

function resolve(name, base) {
  if (/^(\w+:)|\/\//i.test(name)) return name;
  if (/^[.]{0,2}\//i.test(name)) return new URL(name, base == null ? location : base).href;
  if (!name.length || /^[\s._]/.test(name) || /\s$/.test(name)) throw new Error("illegal name");
  return "https://unpkg.com/" + name;
}

const metas = new Map;
const modules = new Map;
const queue$1 = [];
const map$1 = queue$1.map;
const some = queue$1.some;
const hasOwnProperty = queue$1.hasOwnProperty;
const origin = "https://unpkg.com/";
const parseRe = /^((?:@[^/@]+\/)?[^/@]+)(?:@([^/]+))?(?:\/(.*))?$/;

function string(value) {
  return typeof value === "string" ? value : "";
}

function parseIdentifier(identifier) {
  const match = parseRe.exec(identifier);
  return match && {
    name: match[1],
    version: match[2],
    path: match[3]
  };
}

function resolveMeta(target) {
  const url = `${origin}${target.name}${target.version ? `@${target.version}` : ""}/package.json`;
  let meta = metas.get(url);
  if (!meta) metas.set(url, meta = fetch(url).then(response => {
    if (!response.ok) throw new Error("unable to load package.json");
    if (response.redirected && !metas.has(response.url)) metas.set(response.url, meta);
    return response.json();
  }));
  return meta;
}

async function resolve$1(name, base) {
  if (name.startsWith(origin)) name = name.substring(origin.length);
  if (/^(\w+:)|\/\//i.test(name)) return name;
  if (/^[.]{0,2}\//i.test(name)) return new URL(name, base == null ? location : base).href;
  if (!name.length || /^[\s._]/.test(name) || /\s$/.test(name)) throw new Error("illegal name");
  const target = parseIdentifier(name);
  if (!target) return `${origin}${name}`;
  if (!target.version && base != null && base.startsWith(origin)) {
    const meta = await resolveMeta(parseIdentifier(base.substring(origin.length)));
    target.version = meta.dependencies && meta.dependencies[target.name] || meta.peerDependencies && meta.peerDependencies[target.name];
  }
  const meta = await resolveMeta(target);
  return `${origin}${meta.name}@${meta.version}/${target.path || string(meta.unpkg) || string(meta.browser) || string(meta.main) || "index.js"}`;
}

const require = requireFrom(resolve$1);

function requireFrom(resolver) {
  const requireBase = requireRelative(null);

  function requireAbsolute(url) {
    if (typeof url !== "string") return url;
    let module = modules.get(url);
    if (!module) modules.set(url, module = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.onload = () => {
        try { resolve(queue$1.pop()(requireRelative(url))); }
        catch (error) { reject(new Error("invalid module")); }
        script.remove();
      };
      script.onerror = () => {
        reject(new Error("unable to load module"));
        script.remove();
      };
      script.async = true;
      script.src = url;
      window.define = define;
      document.head.appendChild(script);
    }));
    return module;
  }

  function requireRelative(base) {
    return name => Promise.resolve(resolver(name, base)).then(requireAbsolute);
  }

  function requireAlias(aliases) {
    return requireFrom((name, base) => {
      if (name in aliases) {
        name = aliases[name], base = null;
        if (typeof name !== "string") return name;
      }
      return resolver(name, base);
    });
  }

  function require(name) {
    return arguments.length > 1
        ? Promise.all(map$1.call(arguments, requireBase)).then(merge)
        : requireBase(name);
  }

  require.alias = requireAlias;
  require.resolve = resolver;

  return require;
}

function merge(modules) {
  const o = {};
  for (const m of modules) {
    for (const k in m) {
      if (hasOwnProperty.call(m, k)) {
        if (m[k] == null) Object.defineProperty(o, k, {get: getter(m, k)});
        else o[k] = m[k];
      }
    }
  }
  return o;
}

function getter(object, name) {
  return () => object[name];
}

function isexports(name) {
  return (name + "") === "exports";
}

function define(name, dependencies, factory) {
  const n = arguments.length;
  if (n < 2) factory = name, dependencies = [];
  else if (n < 3) factory = dependencies, dependencies = typeof name === "string" ? [] : name;
  queue$1.push(some.call(dependencies, isexports) ? require => {
    const exports = {};
    return Promise.all(map$1.call(dependencies, name => {
      return isexports(name += "") ? exports : require(name);
    })).then(dependencies => {
      factory.apply(null, dependencies);
      return exports;
    });
  } : require => {
    return Promise.all(map$1.call(dependencies, require)).then(dependencies => {
      return typeof factory === "function" ? factory.apply(null, dependencies) : factory;
    });
  });
}

define.amd = {};

function requirer(resolve) {
  return resolve == null ? require : requireFrom(resolve);
}

var svg$1 = template(function(string) {
  var root = document.createElementNS("http://www.w3.org/2000/svg", "g");
  root.innerHTML = string.trim();
  return root;
}, function() {
  return document.createElementNS("http://www.w3.org/2000/svg", "g");
});

var raw = String.raw;

function style(href) {
  return new Promise(function(resolve, reject) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onerror = reject;
    link.onload = resolve;
    document.head.appendChild(link);
  });
}

function tex(require) {
  return function() {
    return Promise.all([
      require("@observablehq/katex@0.10.1/dist/katex.min.js"),
      require.resolve("@observablehq/katex@0.10.1/dist/katex.min.css").then(style)
    ]).then(function(values) {
      var katex = values[0], tex = renderer();

      function renderer(options) {
        return function() {
          var root = document.createElement("div");
          katex.render(raw.apply(String, arguments), root, options);
          return root.removeChild(root.firstChild);
        };
      }

      tex.block = renderer({displayMode: true});
      return tex;
    });
  };
}

var inset = 28;

function width() {
  return observe(function(change) {
    var width = change(window.innerWidth - inset);
    function resized() {
      var width1 = window.innerWidth - inset;
      if (width1 !== width) change(width = width1);
    }
    window.addEventListener("resize", resized);
    return function() {
      window.removeEventListener("resize", resized);
    };
  });
}

function Library(resolver) {
  const require = requirer(resolver);
  Object.defineProperties(this, {
    DOM: {value: DOM, enumerable: true},
    Files: {value: Files, enumerable: true},
    Generators: {value: Generators, enumerable: true},
    html: {value: constant(html), enumerable: true},
    md: {value: md(require), enumerable: true},
    Mutable: {value: constant(Mutable), enumerable: true},
    now: {value: now, enumerable: true},
    Promises: {value: Promises, enumerable: true},
    require: {value: constant(require), enumerable: true},
    resolve: {value: constant(resolve), enumerable: true},
    svg: {value: constant(svg$1), enumerable: true},
    tex: {value: tex(require), enumerable: true},
    width: {value: width, enumerable: true}
  });
}

export { Library };



