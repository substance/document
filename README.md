# Substance Document Model

Read the official documentation [here](http://interior.substance.io/modules/document.html).

## Document Manipulation API

Start with a fresh document.

```js
// If you don't pass a custom schema the latest Substance Document Schema is used
var document = Document.create();
```

This creates a new document at revision 0. It's empty. It doesn't contain anything, as all document content need to be applied using operations.

Let's start with adding a new section:

```js

var newSectionCmd = {
  "rev": 0,
  "user": "michael"
  "steps": [
    ["node:insert", {"type": "section", "properties": {"name": "Open Collaboration"}}]
  ]
};

// if you don't pass a custom schema the official Substance Document Schema is used
document.apply(newSectionCmd);
```

After the command has been applied successfully the document is at revision one.

### Patches

Now say John comes along, he doesn't have access to change the document directly. Instead he's suggesting a patch based on that revision 1.

```js
var patch = {
  "rev": 1,
  "user": "michael",
  "steps": [
  	["node:insert", {"type": "text", "properties": {"content": "Hello World"}}],
    ["node:update", {"id": "section", "properties": {"name": "Open Kollaboratiaun"}}]
  ]
};
```