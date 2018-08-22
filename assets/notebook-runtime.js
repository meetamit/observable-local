function dispatch(node, type, detail) {
  detail = detail || {};
  var document = node.ownerDocument, event = document.defaultView.CustomEvent;
  if (typeof event === "function") {
    event = new event(type, {detail: detail});
  } else {
    event = document.createEvent("Event");
    event.initEvent(type, false, false);
    event.detail = detail;
  }
  node.dispatchEvent(event);
}

// TODO https://twitter.com/mbostock/status/702737065121742848
function isarray(value) {
  return Array.isArray(value)
      || value instanceof Int8Array
      || value instanceof Int16Array
      || value instanceof Int32Array
      || value instanceof Uint8Array
      || value instanceof Uint8ClampedArray
      || value instanceof Uint16Array
      || value instanceof Uint32Array
      || value instanceof Float32Array
      || value instanceof Float64Array;
}

// Non-integer keys in arrays, e.g. [1, 2, 0.5: "value"].
function isindex(key) {
  return key === (key | 0) + "";
}

const symbolToString = Symbol.prototype.toString;

// Symbols do not coerce to strings; they must be explicitly converted.
function formatSymbol(symbol) {
  return symbolToString.call(symbol);
}

const {getOwnPropertySymbols, prototype: {hasOwnProperty}} = Object;
const {toStringTag} = Symbol;

const FORBIDDEN = {};

const symbolsof = getOwnPropertySymbols;

function isown(object, key) {
  return hasOwnProperty.call(object, key);
}

function tagof(object) {
  return object[toStringTag]
      || (object.constructor && object.constructor.name)
      || "Object";
}

function valueof(object, key) {
  try {
    const value = object[key];
    if (value) value.constructor; // Test for SecurityError.
    return value;
  } catch (ignore) {
    return FORBIDDEN;
  }
}

function inspectExpanded(object) {
  const arrayish = isarray(object);
  let tag, fields, next;

  if (object instanceof Map) {
    tag = `Map(${object.size})`;
    fields = iterateMap$1;
  } else if (object instanceof Set) {
    tag = `Set(${object.size})`;
    fields = iterateSet$1;
  } else if (arrayish) {
    tag = `${object.constructor.name}(${object.length})`;
    fields = iterateArray$1;
  } else {
    tag = tagof(object);
    fields = iterateObject$1;
  }

  const span = document.createElement("span");
  span.className = "observablehq--expanded";
  const a = span.appendChild(document.createElement("a"));
  a.innerHTML =`<svg width=8 height=8 class='observablehq--caret'>
    <path d='M4 7L0 1h8z' fill='currentColor' />
  </svg>`;
  a.appendChild(document.createTextNode(`${tag}${arrayish ? " [" : " {"}`));
  a.addEventListener("mouseup", function(event) {
    event.stopPropagation();
    replace(span, inspectCollapsed(object));
  });

  fields = fields(object);
  for (let i = 0; !(next = fields.next()).done && i < 20; ++i) {
    span.appendChild(next.value);
  }

  if (!next.done) {
    const a = span.appendChild(document.createElement("a"));
    a.className = "observablehq--field";
    a.style.display = "block";
    a.appendChild(document.createTextNode(`  & more`));
    a.addEventListener("mouseup", function(event) {
      event.stopPropagation();
      span.insertBefore(next.value, span.lastChild.previousSibling);
      for (let i = 0; !(next = fields.next()).done && i < 19; ++i) {
        span.insertBefore(next.value, span.lastChild.previousSibling);
      }
      if (next.done) span.removeChild(span.lastChild.previousSibling);
      dispatch(span, "load");
    });
  }

  span.appendChild(document.createTextNode(arrayish ? "]" : "}"));

  return span;
}

function* iterateMap$1(map) {
  for (const [key, value] of map) {
    yield formatMapField$1(key, value);
  }
  yield* iterateObject$1(map);
}

function* iterateSet$1(set) {
  for (const value of set) {
    yield formatSetField(value);
  }
  yield* iterateObject$1(set);
}

function* iterateArray$1(array) {
  for (let i = 0, n = array.length; i < n; ++i) {
    if (i in array) {
      yield formatField$1(i, valueof(array, i), "observablehq--index");
    }
  }
  for (const key in array) {
    if (!isindex(key) && isown(array, key)) {
      yield formatField$1(key, valueof(array, key), "observablehq--key");
    }
  }
  for (const symbol of symbolsof(array)) {
    yield formatField$1(formatSymbol(symbol), valueof(array, symbol), "observablehq--symbol");
  }
}

function* iterateObject$1(object) {
  for (const key in object) {
    if (isown(object, key)) {
      yield formatField$1(key, valueof(object, key), "observablehq--key");
    }
  }
  for (const symbol of symbolsof(object)) {
    yield formatField$1(formatSymbol(symbol), valueof(object, symbol), "observablehq--symbol");
  }
}

function formatField$1(key, value, className) {
  const item = document.createElement("div");
  const span = item.appendChild(document.createElement("span"));
  item.className = "observablehq--field";
  span.className = className;
  span.textContent = `  ${key}`;
  item.appendChild(document.createTextNode(": "));
  item.appendChild(inspect(value));
  return item;
}

function formatMapField$1(key, value) {
  const item = document.createElement("div");
  item.className = "observablehq--field";
  item.appendChild(document.createTextNode("  "));
  item.appendChild(inspect(key));
  item.appendChild(document.createTextNode(" => "));
  item.appendChild(inspect(value));
  return item;
}

function formatSetField(value) {
  const item = document.createElement("div");
  item.className = "observablehq--field";
  item.appendChild(document.createTextNode("  "));
  item.appendChild(inspect(value));
  return item;
}

function inspectCollapsed(object, shallow) {
  const arrayish = isarray(object);
  let tag, fields, next;

  if (object instanceof Map) {
    tag = `Map(${object.size})`;
    fields = iterateMap;
  } else if (object instanceof Set) {
    tag = `Set(${object.size})`;
    fields = iterateSet;
  } else if (arrayish) {
    tag = `${object.constructor.name}(${object.length})`;
    fields = iterateArray;
  } else {
    tag = tagof(object);
    fields = iterateObject;
  }

  if (shallow) {
    const span = document.createElement("span");
    span.className = "observablehq--shallow";
    span.appendChild(document.createTextNode(tag));
    span.addEventListener("mouseup", function(event) {
      event.stopPropagation();
      replace(span, inspectCollapsed(object));
    });
    return span;
  }

  const span = document.createElement("span");
  span.className = "observablehq--collapsed";
  const a = span.appendChild(document.createElement("a"));
  a.innerHTML =`<svg width=8 height=8 class='observablehq--caret'>
    <path d='M7 4L1 8V0z' fill='currentColor' />
  </svg>`;
  a.appendChild(document.createTextNode(`${tag}${arrayish ? " [" : " {"}`));
  span.addEventListener("mouseup", function(event) {
    event.stopPropagation();
    replace(span, inspectExpanded(object));
  }, true);

  fields = fields(object);
  for (let i = 0; !(next = fields.next()).done && i < 20; ++i) {
    if (i > 0) span.appendChild(document.createTextNode(", "));
    span.appendChild(next.value);
  }

  if (!next.done) span.appendChild(document.createTextNode(", &"));
  span.appendChild(document.createTextNode(arrayish ? "]" : "}"));

  return span;
}

function* iterateMap(map) {
  for (const [key, value] of map) {
    yield formatMapField(key, value);
  }
  yield* iterateObject(map);
}

function* iterateSet(set) {
  for (const value of set) {
    yield inspect(value, true);
  }
  yield* iterateObject(set);
}

function* iterateArray(array) {
  for (let i0 = -1, i1 = 0, n = array.length; i1 < n; ++i1) {
    if (i1 in array) {
      let e = i1 - i0 - 1;
      if (e > 0) {
        const span = document.createElement("span");
        span.className = "observablehq--empty";
        span.textContent = e === 1 ? "empty" : `empty � ${i1 - i0 - 1}`;
        yield span;
      }
      yield inspect(valueof(array, i1), true);
      i0 = i1;
    }
  }
  for (const key in array) {
    if (!isindex(key) && isown(array, key)) {
      yield formatField(key, valueof(array, key), "observablehq--key");
    }
  }
  for (const symbol of symbolsof(array)) {
    yield formatField(formatSymbol(symbol), valueof(array, symbol), "observablehq--symbol");
  }
}

function* iterateObject(object) {
  for (const key in object) {
    if (isown(object, key)) {
      yield formatField(key, valueof(object, key), "observablehq--key");
    }
  }
  for (const symbol of symbolsof(object)) {
    yield formatField(formatSymbol(symbol), valueof(object, symbol), "observablehq--symbol");
  }
}

function formatField(key, value, className) {
  const fragment = document.createDocumentFragment();
  const span = fragment.appendChild(document.createElement("span"));
  span.className = className;
  span.textContent = key;
  fragment.appendChild(document.createTextNode(": "));
  fragment.appendChild(inspect(value, true));
  return fragment;
}

function formatMapField(key, value) {
  const fragment = document.createDocumentFragment();
  fragment.appendChild(inspect(key, true));
  fragment.appendChild(document.createTextNode(" => "));
  fragment.appendChild(inspect(value, true));
  return fragment;
}

function pad(value, width) {
  var s = value + "", length = s.length;
  return length < width ? new Array(width - length + 1).join(0) + s : s;
}

function formatDate(date) {
  return isNaN(date) ? "Invalid Date"
      : pad(date.getFullYear(), 4) + "-"
      + pad(date.getMonth() + 1, 2) + "-"
      + pad(date.getDate(), 2)
      + (date.getMilliseconds() ? "T"
          + pad(date.getHours(), 2) + ":"
          + pad(date.getMinutes(), 2) + ":"
          + pad(date.getSeconds(), 2) + "."
          + pad(date.getMilliseconds(), 3)
      : date.getSeconds() ? "T"
          + pad(date.getHours(), 2) + ":"
          + pad(date.getMinutes(), 2) + ":"
          + pad(date.getSeconds(), 2)
      : date.getMinutes() || date.getHours() ? "T"
          + pad(date.getHours(), 2) + ":"
          + pad(date.getMinutes(), 2)
      : "");
}

var errorToString = Error.prototype.toString;

function formatError(value) {
  return value.stack || errorToString.call(value);
}

var regExpToString = RegExp.prototype.toString;

function formatRegExp(value) {
  return regExpToString.call(value);
}

/* eslint-disable no-control-regex */

function formatString(string, full) {
  if (full) return (count(string, /["\n]/g) <= count(string, /`|\${/g) ? JSON.stringify : templatify)(string);
  if (string.length > 100) string = `${string.slice(0, 50)}&${string.slice(-49)}`;
  return JSON.stringify(string);
}

function templatify(string) {
  return "`" + string.replace(/[\\`\x00-\x09\x0b-\x19]|\${/g, templatifyChar) + "`";
}

function templatifyChar(char) {
  var code = char.charCodeAt(0);
  return code < 0x10 ? "\\x0" + code.toString(16)
      : code < 0x20 ? "\\x" + code.toString(16)
      : "\\" + char;
}

function count(string, re) {
  var n = 0;
  while (re.exec(string)) ++n;
  return n;
}

var toString$1 = Function.prototype.toString;
var TYPE_ASYNC = {prefix: "async �"};
var TYPE_ASYNC_GENERATOR = {prefix: "async �*"};
var TYPE_CLASS = {prefix: "class"};
var TYPE_FUNCTION = {prefix: "�"};
var TYPE_GENERATOR = {prefix: "�*"};

function inspectFunction(f) {
  var type, m, t = toString$1.call(f);

  switch (f.constructor && f.constructor.name) {
    case "AsyncFunction": type = TYPE_ASYNC; break;
    case "AsyncGeneratorFunction": type = TYPE_ASYNC_GENERATOR; break;
    case "GeneratorFunction": type = TYPE_GENERATOR; break;
    default: type = /^class\b/.test(t) ? TYPE_CLASS : TYPE_FUNCTION; break;
  }

  // A class, possibly named.
  // class Name
  if (type === TYPE_CLASS) {
    return formatFunction(type, f.name || "");
  }

  // An arrow function with a single argument.
  // foo =>
  // async foo =>
  if (m = /^(?:async\s*)?(\w+)\s*=>/.exec(t)) {
    return formatFunction(type, "(" + m[1] + ")");
  }

  // An arrow function with parenthesized arguments.
  // (&)
  // async (&)
  if (m = /^(?:async\s*)?\(\s*(\w+(?:\s*,\s*\w+)*)?\s*\)/.exec(t)) {
    return formatFunction(type, m[1] ? "(" + m[1].replace(/\s*,\s*/g, ", ") + ")" : "()");
  }

  // A function, possibly: async, generator, anonymous, simply arguments.
  // function name(&)
  // function* name(&)
  // async function name(&)
  // async function* name(&)
  if (m = /^(?:async\s*)?function(?:\s*\*)?(?:\s*\w+)?\s*\(\s*(\w+(?:\s*,\s*\w+)*)?\s*\)/.exec(t)) {
    return formatFunction(type, (f.name || "") + (m[1] ? "(" + m[1].replace(/\s*,\s*/g, ", ") + ")" : "()"));
  }

  // Something else, like destructuring, comments or default values.
  return formatFunction(type, (f.name || "") + "(&)");
}

function formatFunction(type, name) {
  var span = document.createElement("span");
  span.className = "observablehq--function";
  var spanType = span.appendChild(document.createElement("span"));
  spanType.className = "observablehq--keyword";
  spanType.textContent = type.prefix;
  span.appendChild(document.createTextNode(" " + name));
  return span;
}

const {prototype: {toString}} = Object;

function inspect(value, shallow, expand) {
  let type = typeof value;
  switch (type) {
    case "boolean":
    case "undefined": { value += ""; break; }
    case "number": { value = value === 0 && 1 / value < 0 ? "-0" : value + ""; break; }
    case "bigint": { value = value + "n"; break; }
    case "string": { value = formatString(value, shallow === false); break; }
    case "symbol": { value = formatSymbol(value); break; }
    case "function": { return inspectFunction(value); }
    default: {
      if (value === null) { type = null, value = "null"; break; }
      if (value instanceof Date) { type = "date", value = formatDate(value); break; }
      if (value === FORBIDDEN) { type = "forbidden", value = "[forbidden]"; break; }
      switch (toString.call(value)) {
        case "[object RegExp]": { type = "regexp", value = formatRegExp(value); break; }
        case "[object Error]": // https://github.com/lodash/lodash/blob/master/isError.js#L26
        case "[object DOMException]": { type = "error", value = formatError(value); break; }
        default: return (expand ? inspectExpanded : inspectCollapsed)(value, shallow);
      }
      break;
    }
  }
  const span = document.createElement("span");
  span.className = `observablehq--${type}`;
  span.textContent = value;
  return span;
}

function replace(spanOld, spanNew) {
  if (spanOld.classList.contains("observablehq--inspect")) spanNew.classList.add("observablehq--inspect");
  spanOld.parentNode.replaceChild(spanNew, spanOld);
  dispatch(spanNew, "load");
}

const LOCATION_MATCH = /\s+\(\d+:\d+\)$/m;

class Inspector {
  constructor(node) {
    if (!node) throw new Error("invalid node");
    this._node = node;
    node.classList.add("observablehq");
  }
  pending() {
    const {_node} = this;
    _node.classList.remove("observablehq--error");
    _node.classList.add("observablehq--running");
  }
  fulfilled(value) {
    const {_node} = this;
    if (!(value instanceof Element || value instanceof Text) || (value.parentNode && value.parentNode !== _node)) {
      value = inspect(value, false, _node.firstChild // TODO Do this better.
          && _node.firstChild.classList
          && _node.firstChild.classList.contains("observablehq--expanded"));
      value.classList.add("observablehq--inspect");
    }
    _node.classList.remove("observablehq--running", "observablehq--error");
    if (_node.firstChild !== value) {
      if (_node.firstChild) {
        while (_node.lastChild !== _node.firstChild) _node.removeChild(_node.lastChild);
        _node.replaceChild(value, _node.firstChild);
      } else {
        _node.appendChild(value);
      }
    }
    dispatch(_node, "update");
  }
  rejected(error) {
    const {_node} = this;
    _node.classList.remove("observablehq--running");
    _node.classList.add("observablehq--error");
    while (_node.lastChild) _node.removeChild(_node.lastChild);
    var span = document.createElement("span");
    span.className = "observablehq--inspect";
    span.textContent = (error + "").replace(LOCATION_MATCH, "");
    _node.appendChild(span);
    dispatch(_node, "error", {error: error});
  }
}

Inspector.into = function(container) {
  if (typeof container === "string") {
    container = document.querySelector(container);
    if (container == null) throw new Error("container not found");
  }
  return function() {
    return new Inspector(container.appendChild(document.createElement("div")));
  };
};

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

var count$1 = 0;

function uid(name) {
  return new Id("O-" + (name == null ? "" : name + "-") + ++count$1);
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
    var event = eventof(input), value = valueof$1(input);
    function inputted() { change(valueof$1(input)); }
    input.addEventListener(event, inputted);
    if (value !== undefined) change(value);
    return function() { input.removeEventListener(event, inputted); };
  });
}

function valueof$1(input) {
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
const hasOwnProperty$1 = queue$1.hasOwnProperty;
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
      if (hasOwnProperty$1.call(m, k)) {
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

function RuntimeError(message, input) {
  this.message = message + "";
  this.input = input;
}

RuntimeError.prototype = Object.create(Error.prototype);
RuntimeError.prototype.name = "RuntimeError";
RuntimeError.prototype.constructor = RuntimeError;

function generatorish(value) {
  return value
      && typeof value.next === "function"
      && typeof value.return === "function";
}

function load(notebook, library, observer) {
  if (typeof library == "function") observer = library, library = null;
  if (typeof observer !== "function") throw new Error("invalid observer");
  if (library == null) library = new Library();

  const {modules, id} = notebook;
  const map = new Map;
  const runtime = new Runtime(library);
  const main = runtime_module(id);

  function runtime_module(id) {
    let module = map.get(id);
    if (!module) map.set(id, module = runtime.module());
    return module;
  }

  for (const m of modules) {
    const module = runtime_module(m.id);
    let i = 0;
    for (const v of m.variables) {
      if (v.from) module.import(v.remote, v.name, runtime_module(v.from));
      else if (module === main) module.variable(observer(v, i, m.variables)).define(v.name, v.inputs, v.value);
      else module.define(v.name, v.inputs, v.value);
      ++i;
    }
  }

  return runtime;
}

var prototype = Array.prototype;
var map$1$1 = prototype.map;
var forEach = prototype.forEach;

function identity(x) {
  return x;
}

function constant$1(x) {
  return function() {
    return x;
  };
}

function noop() {}

var TYPE_NORMAL = 1; // a normal variable
var TYPE_IMPLICIT = 2; // created on reference
var TYPE_DUPLICATE = 3; // created on duplicate definition

var no_observer = {};

function Variable(type, module, observer) {
  if (observer == null) observer = no_observer;
  Object.defineProperties(this, {
    _observer: {value: observer, writable: true},
    _definition: {value: variable_undefined, writable: true},
    _duplicate: {value: undefined, writable: true},
    _duplicates: {value: undefined, writable: true},
    _indegree: {value: -1, writable: true}, // The number of computing inputs.
    _inputs: {value: [], writable: true},
    _invalidate: {value: noop, writable: true},
    _module: {value: module},
    _name: {value: null, writable: true},
    _outputs: {value: new Set, writable: true},
    _promise: {value: Promise.resolve(undefined), writable: true},
    _reachable: {value: observer !== no_observer, writable: true}, // Is this variable transitively visible?
    _rejector: {value: variable_rejector(this)},
    _type: {value: type},
    _value: {value: undefined, writable: true},
    _version: {value: 0, writable: true}
  });
}

Object.defineProperties(Variable.prototype, {
  _pending: {value: variable_pending, writable: true, configurable: true},
  _fulfilled: {value: variable_fulfilled, writable: true, configurable: true},
  _rejected: {value: variable_rejected, writable: true, configurable: true},
  define: {value: variable_define, writable: true, configurable: true},
  delete: {value: variable_delete, writable: true, configurable: true},
  import: {value: variable_import, writable: true, configurable: true}
});

function variable_attach(variable) {
  variable._module._runtime._dirty.add(variable);
  variable._outputs.add(this);
}

function variable_detach(variable) {
  variable._module._runtime._dirty.add(variable);
  variable._outputs.delete(this);
}

function variable_undefined() {
  throw variable_undefined;
}

function variable_rejector(variable) {
  return function(error) {
    if (error === variable_undefined) throw new RuntimeError(variable._name + " is not defined", variable._name);
    throw new RuntimeError(variable._name + " could not be resolved", variable._name);
  };
}

function variable_duplicate(name) {
  return function() {
    throw new RuntimeError(name + " is defined more than once");
  };
}

function variable_define(name, inputs, definition) {
  switch (arguments.length) {
    case 1: {
      definition = name, name = inputs = null;
      break;
    }
    case 2: {
      definition = inputs;
      if (typeof name === "string") inputs = null;
      else inputs = name, name = null;
      break;
    }
  }
  return variable_defineImpl.call(this,
    name == null ? null : name + "",
    inputs == null ? [] : map$1$1.call(inputs, this._module._resolve, this._module),
    typeof definition === "function" ? definition : constant$1(definition)
  );
}

function variable_defineImpl(name, inputs, definition) {
  var scope = this._module._scope, runtime = this._module._runtime;

  this._inputs.forEach(variable_detach, this);
  inputs.forEach(variable_attach, this);
  this._inputs = inputs;
  this._definition = definition;
  this._value = undefined;

  // Did the variables name change? Time to patch references!
  if (name == this._name && scope.get(name) === this) {
    this._outputs.forEach(runtime._updates.add, runtime._updates);
  } else {
    var error, found;

    if (this._name) { // Did this variable previously have a name?
      if (this._outputs.size) { // And did other variables reference this variable?
        scope.delete(this._name);
        found = this._module._resolve(this._name);
        found._outputs = this._outputs, this._outputs = new Set;
        found._outputs.forEach(function(output) { output._inputs[output._inputs.indexOf(this)] = found; }, this);
        found._outputs.forEach(runtime._updates.add, runtime._updates);
        runtime._dirty.add(found).add(this);
        scope.set(this._name, found);
      } else if ((found = scope.get(this._name)) === this) { // Do no other variables reference this variable?
        scope.delete(this._name); // Its safe to delete!
      } else if (found._type === TYPE_DUPLICATE) { // Do other variables assign this name?
        found._duplicates.delete(this); // This variable no longer assigns this name.
        this._duplicate = undefined;
        if (found._duplicates.size === 1) { // Is there now only one variable assigning this name?
          found = found._duplicates.keys().next().value; // Any references are now fixed!
          error = scope.get(this._name);
          found._outputs = error._outputs, error._outputs = new Set;
          found._outputs.forEach(function(output) { output._inputs[output._inputs.indexOf(error)] = found; });
          found._definition = found._duplicate, found._duplicate = undefined;
          runtime._dirty.add(error).add(found);
          runtime._updates.add(found);
          scope.set(this._name, found);
        }
      } else {
        throw new Error;
      }
    }

    if (this._outputs.size) throw new Error;

    if (name) { // Does this variable have a new name?
      if (found = scope.get(name)) { // Do other variables reference or assign this name?
        if (found._type === TYPE_DUPLICATE) { // Do multiple other variables already define this name?
          this._definition = variable_duplicate(name), this._duplicate = definition;
          found._duplicates.add(this);
        } else if (found._type === TYPE_IMPLICIT) { // Are the variable references broken?
          this._outputs = found._outputs, found._outputs = new Set; // Now theyre fixed!
          this._outputs.forEach(function(output) { output._inputs[output._inputs.indexOf(found)] = this; }, this);
          runtime._dirty.add(found).add(this);
          scope.set(name, this);
        } else { // Does another variable define this name?
          found._duplicate = found._definition, this._duplicate = definition; // Now theyre duplicates.
          error = new Variable(TYPE_DUPLICATE, this._module);
          error._name = name;
          error._definition = this._definition = found._definition = variable_duplicate(name);
          error._outputs = found._outputs, found._outputs = new Set;
          error._outputs.forEach(function(output) { output._inputs[output._inputs.indexOf(found)] = error; });
          error._duplicates = new Set([this, found]);
          runtime._dirty.add(found).add(error);
          runtime._updates.add(found).add(error);
          scope.set(name, error);
        }
      } else {
        scope.set(name, this);
      }
    }

    this._name = name;
  }

  runtime._updates.add(this);
  runtime._compute();
  return this;
}

function variable_import(remote, name, module) {
  if (arguments.length < 3) module = name, name = remote;
  return variable_defineImpl.call(this, name + "", [module._resolve(remote + "")], identity);
}

function variable_delete() {
  return variable_defineImpl.call(this, null, [], noop);
}

function variable_pending() {
  if (this._observer.pending) this._observer.pending();
}

function variable_fulfilled(value) {
  if (this._observer.fulfilled) this._observer.fulfilled(value);
}

function variable_rejected(error) {
  if (this._observer.rejected) this._observer.rejected(error);
}

var none = new Map;

function Module(runtime) {
  Object.defineProperties(this, {
    _runtime: {value: runtime},
    _scope: {value: new Map}
  });
}

Object.defineProperties(Module.prototype, {
  _copy: {value: module_copy, writable: true, configurable: true},
  _resolve: {value: module_resolve, writable: true, configurable: true},
  define: {value: module_define, writable: true, configurable: true},
  derive: {value: module_derive, writable: true, configurable: true},
  import: {value: module_import, writable: true, configurable: true},
  variable: {value: module_variable, writable: true, configurable: true}
});

function module_define() {
  var v = new Variable(TYPE_NORMAL, this);
  return v.define.apply(v, arguments);
}

function module_import() {
  var v = new Variable(TYPE_NORMAL, this);
  return v.import.apply(v, arguments);
}

function module_variable(observer) {
  return new Variable(TYPE_NORMAL, this, observer);
}

function module_derive(injects, injectModule) {
  var injectByAlias = new Map;
  forEach.call(injects, function(inject) {
    if (typeof inject !== "object") inject = {name: inject + ""};
    if (inject.alias == null) inject.alias = inject.name;
    injectByAlias.set(inject.alias, inject);
  });
  return this._copy(injectByAlias, injectModule, new Map);
}

function module_copy(injectByAlias, injectModule, map) {
  var copy = new Module(this._runtime);
  map.set(this, copy);
  this._scope.forEach(function(source, name) {
    var target = new Variable(source._type, copy), inject;
    if (inject = injectByAlias.get(name)) {
      target.import(inject.name, inject.alias, injectModule);
    } else if (source._definition === identity) { // import!
      var sourceInput = source._inputs[0],
          sourceModule = sourceInput._module,
          targetModule = map.get(sourceModule) || sourceModule._copy(none, null, map);
      target.import(sourceInput._name, name, targetModule);
    } else {
      target.define(name, source._inputs.map(variable_name), source._definition);
    }
  });
  return copy;
}

function module_resolve(name) {
  var variable = this._scope.get(name);
  if (!variable)  {
    variable = new Variable(TYPE_IMPLICIT, this);
    if (this._runtime._builtin._scope.has(name)) {
      variable.import(name, this._runtime._builtin);
    } else if (name === "invalidation") {
      variable.define(name, variable_invalidation);
    } else if (name === "visibility") {
      variable.define(name, variable_visibility);
    } else {
      this._scope.set(variable._name = name, variable);
    }
  }
  return variable;
}

function variable_name(variable) {
  return variable._name;
}

var variable_invalidation = {};
var variable_visibility = {};

function Runtime(builtins) {
  var builtin = this.module();
  Object.defineProperties(this, {
    _dirty: {value: new Set},
    _updates: {value: new Set},
    _computing: {value: null, writable: true},
    _builtin: {value: builtin}
  });
  if (builtins) for (var name in builtins) {
    (new Variable(TYPE_IMPLICIT, builtin)).define(name, [], builtins[name]);
  }
}

Object.defineProperties(Runtime, {
  load: {value: load, writable: true, configurable: true}
});

Object.defineProperties(Runtime.prototype, {
  _compute: {value: runtime_compute, writable: true, configurable: true},
  _computeSoon: {value: runtime_computeSoon, writable: true, configurable: true},
  _computeNow: {value: runtime_computeNow, writable: true, configurable: true},
  module: {value: runtime_module, writable: true, configurable: true}
});

function runtime_module() {
  return new Module(this);
}

function runtime_compute() {
  return this._computing || (this._computing = this._computeSoon());
}

function runtime_computeSoon() {
  var runtime = this;
  return new Promise(function(resolve) {
    requestAnimationFrame(function() {
      resolve();
      runtime._computeNow();
    });
  });
}

function runtime_computeNow() {
  var queue = [],
      variables,
      variable;

  // Compute the reachability of the transitive closure of dirty variables.
  // Any newly-reachable variable must also be recomputed.
  // Any no-longer-reachable variable must be terminated.
  variables = new Set(this._dirty);
  variables.forEach(function(variable) {
    variable._inputs.forEach(variables.add, variables);
    const reachable = variable_reachable(variable);
    if (reachable > variable._reachable) {
      this._updates.add(variable);
    } else if (reachable < variable._reachable) {
      variable._invalidate();
    }
    variable._reachable = reachable;
  }, this);

  // Compute the transitive closure of updating, reachable variables.
  variables = new Set(this._updates);
  variables.forEach(function(variable) {
    if (variable._reachable) {
      variable._indegree = 0;
      variable._outputs.forEach(variables.add, variables);
    } else {
      variable._indegree = -1;
      variables.delete(variable);
    }
  });

  this._computing = null;
  this._updates.clear();
  this._dirty.clear();

  // Compute the indegree of updating variables.
  variables.forEach(function(variable) {
    variable._outputs.forEach(variable_increment);
  });

  // Identify the root variables (those with no updating inputs).
  variables.forEach(function(variable) {
    if (variable._indegree === 0) {
      queue.push(variable);
    }
  });

  // Compute the variables in topological order.
  while (variable = queue.pop()) {
    variable_compute(variable);
    variable._outputs.forEach(postqueue);
    variables.delete(variable);
  }

  // Any remaining variables have circular definitions.
  variables.forEach(function(variable) {
    var error = new RuntimeError("circular definition");
    variable._value = undefined;
    (variable._promise = Promise.reject(error)).catch(noop);
    variable._rejected(error);
  });

  function postqueue(variable) {
    if (--variable._indegree === 0) {
      queue.push(variable);
    }
  }
}

function variable_increment(variable) {
  ++variable._indegree;
}

function variable_value(variable) {
  return variable._promise.catch(variable._rejector);
}

function variable_invalidator(variable) {
  return new Promise(function(resolve) {
    variable._invalidate = resolve;
  });
}

function variable_intersector(invalidation, variable) {
  let node = typeof IntersectionObserver === "function" && variable._observer && variable._observer._node;
  let visible = !node, resolve = noop, reject = noop, promise, observer;
  if (node) {
    observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting) && (promise = null, resolve()));
    observer.observe(node);
    invalidation.then(() => (observer.disconnect(), observer = null, reject()));
  }
  return function(value) {
    if (visible) return Promise.resolve(value);
    if (!observer) return Promise.reject();
    if (!promise) promise = new Promise((y, n) => (resolve = y, reject = n));
    return promise.then(() => value);
  };
}

function variable_compute(variable) {
  variable._invalidate();
  variable._invalidate = noop;
  variable._pending();
  var value0 = variable._value,
      version = ++variable._version,
      invalidation = null,
      promise = variable._promise = Promise.all(variable._inputs.map(variable_value)).then(function(inputs) {
    if (variable._version !== version) return;

    // Replace any reference to invalidation with the promise, lazily.
    for (var i = 0, n = inputs.length; i < n; ++i) {
      switch (inputs[i]) {
        case variable_invalidation: {
          inputs[i] = invalidation = variable_invalidator(variable);
          break;
        }
        case variable_visibility: {
          if (!invalidation) invalidation = variable_invalidator(variable);
          inputs[i] = variable_intersector(invalidation, variable);
          break;
        }
      }
    }

    // Compute the initial value of the variable.
    return variable._definition.apply(value0, inputs);
  }).then(function(value) {
    // If the value is a generator, then retrieve its first value,
    // and dispose of the generator if the variable is invalidated.
    if (generatorish(value)) {
      (invalidation || variable_invalidator(variable)).then(variable_return(value));
      return variable_precompute(variable, version, promise, value);
    }
    return value;
  });
  promise.then(function(value) {
    if (variable._version !== version) return;
    variable._value = value;
    variable._fulfilled(value);
  }, function(error) {
    if (variable._version !== version) return;
    variable._value = undefined;
    variable._rejected(error);
  });
}

function variable_precompute(variable, version, promise, generator) {
  function recompute() {
    var promise = new Promise(function(resolve) {
      resolve(generator.next());
    }).then(function(next) {
      return next.done ? undefined : Promise.resolve(next.value).then(function(value) {
        if (variable._version !== version) return;
        variable_postrecompute(variable, value, promise).then(recompute);
        variable._fulfilled(value);
        return value;
      });
    });
    promise.catch(function(error) {
      if (variable._version !== version) return;
      variable_postrecompute(variable, undefined, promise);
      variable._rejected(error);
    });
  }
  return new Promise(function(resolve) {
    resolve(generator.next());
  }).then(function(next) {
    if (next.done) return;
    promise.then(recompute);
    return next.value;
  });
}

function variable_postrecompute(variable, value, promise) {
  var runtime = variable._module._runtime;
  variable._value = value;
  variable._promise = promise;
  variable._outputs.forEach(runtime._updates.add, runtime._updates); // TODO Cleaner?
  return runtime._compute();
}

function variable_return(generator) {
  return function() {
    generator.return();
  };
}

function variable_reachable(variable) {
  if (variable._observer !== no_observer) return true; // Directly reachable.
  var outputs = new Set(variable._outputs);
  for (const output of outputs) {
    if (output._observer !== no_observer) return true;
    output._outputs.forEach(outputs.add, outputs);
  }
  return false;
}

export { Inspector, Library, Runtime, RuntimeError };



