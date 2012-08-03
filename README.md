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
var newSectionOp = {
  "rev": 0,
  "user": "michael"
  "steps": [
    ["node:insert", {type": "section", "properties": {"id": "open-collab", name": "Open Collaboration"}}]
  ]
};

document.apply(newSectionOp);
```

After the command has been applied successfully the document is at revision one.

### Patches

Now say John comes along, he doesn't have access to change the document directly. Instead he's suggesting a patch based on that revision 1.

```js
var addPatchOp = {
  "rev": 1,
  "user": "michael",
  "steps": [
  	["node:insert", {"type": "text", "properties": {"content": "Ein erster Paragraph."}}],
    ["node:update", {"node": "open-collab", "properties": {"name": "Offene Kollaboration"}}]
  ]
};

// This should use the apply interface
document.addPatch(addPathOp);
```

This patch is just stored separately, but not applied to the document yet, as it needs to be reviewed and confirmed. So let's assume in the meanwhile we have some more document updates.

Our document still doesn't have a title. So let's change that.

```js
var setTitleOp = {
  "rev": 1,
  "user": "michael",
  "steps": [
    ["document:update", {"properties": {"content": "Hallo Welt"}}]
  ]
};
document.apply(setTitleOp);
```

Also let's add a disclaimer, at the bottom of the document.

```js
var addTextOp = {
  "rev": 2,
  "user": "michael",
  "steps": [
    ["document:update", {"properties": {"content": "Hallo Welt"}}]
  ]
};
document.apply(setTitleOp);
```