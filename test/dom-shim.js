class NodeShim {
  childNodes = [];
  parentNode = null;
  ownerDocument = null;
  nodeType = 1;
  textContent = "";

  appendChild(child) {
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  removeChild(child) {
    this.childNodes = this.childNodes.filter((node) => node !== child);
    child.parentNode = null;
    return child;
  }

  insertBefore(child) {
    return this.appendChild(child);
  }

  addEventListener() {}

  removeEventListener() {}
}

class ElementShim extends NodeShim {
  style = {};
  namespaceURI = "http://www.w3.org/1999/xhtml";

  constructor(tag) {
    super();
    this.tagName = tag.toUpperCase();
    this.nodeName = this.tagName;
  }

  setAttribute() {}

  getAttribute() {
    return null;
  }

  hasAttribute() {
    return false;
  }
}

class IframeShim extends ElementShim {
  constructor() {
    super("iframe");
  }
}

class TextShim extends NodeShim {
  constructor(text) {
    super();
    this.nodeType = 3;
    this.nodeName = "#text";
    this.nodeValue = text;
    this.textContent = text;
  }
}

class DocumentShim extends NodeShim {
  nodeName = "#document";

  constructor() {
    super();
    this.nodeType = 9;
    this.documentElement = new ElementShim("html");
    this.body = new ElementShim("body");
    this.head = new ElementShim("head");
    this.activeElement = this.body;
    this.documentElement.appendChild(this.body);
    this.documentElement.appendChild(this.head);
    this.defaultView = globalThis;
  }

  createElement(tag) {
    const element = new ElementShim(tag);
    element.ownerDocument = this;
    return element;
  }

  createElementNS(_namespace, tag) {
    return this.createElement(tag);
  }

  createTextNode(text) {
    const node = new TextShim(text);
    node.ownerDocument = this;
    return node;
  }
}

const documentShim = new DocumentShim();
globalThis.document = documentShim;
globalThis.window = globalThis;
globalThis.Node = NodeShim;
globalThis.Element = ElementShim;
globalThis.HTMLElement = ElementShim;
globalThis.HTMLIFrameElement = IframeShim;
globalThis.Text = TextShim;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
