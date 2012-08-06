# Substance Document Model

Read the official documentation [here](http://interior.substance.io/modules/document.html), which gets updated on every major release.

## Document Manipulation API

A complete JSON-serialized version of a document looks like this:

```js
var doc = {
  "id": "hello-world",
  "user": "michael",
  "refs": {
    "head": "commit-2",
    "patch-1": "commit-5"
  },
  "commits": {
    "commit-1": {
      "op": ["node:insert", {"type": "section", "properties": {"name": "Hello?"}}],
      "user": "michael",
      "parent": null
    },

    "commit-2": {
      "op": ["node:insert", {"type": "text", "properties": {"content": "Hello there."}}],
      "user": "michael",
      "parent": "commit-1"
    },

    "commit-3": {
      "op": ["node:insert", {"type": "text", "properties": {"content": "Ein erster Paragraph."}}],
      "user": "michael",
      "parent": "commit-2"
    },

    "commit-4": {
      "op": ["node:insert", {"type": "text", "properties": {"content": "This is the end."}}],
      "user": "michael",
      "parent": "commit-2"
    },

    "commit-5": {
      "op": ["node:insert", {"type": "text", "properties": {"content": "Ein zweiter paragraph."}}],
      "user": "michael",
      "parent": "commit-3"
    }
  }
};
```


Start tracking a document

```js
// If you don't pass a custom schema the latest Substance Document Schema is used
var doc = new Document(doc)
```

By default, the current head of your document gets reconstructed. So if you want to expect the current state of your document, do this:


```js
doc.content
```

You get a JSON compatible representation of your document

```js
{ properties: {},
  nodes: 
   { '9da1232c2f3a32742ddaa5cd320064a4': 
      { type: 'section',
        properties: [Object],
        id: '9da1232c2f3a32742ddaa5cd320064a4',
        prev: null,
        next: null },
     '9ad2c5c966f399bdcd0b61e144f02840': 
      { type: 'text',
        properties: [Object],
        id: '9ad2c5c966f399bdcd0b61e144f02840',
        prev: '9da1232c2f3a32742ddaa5cd320064a4',
        next: null } },
  head: '9da1232c2f3a32742ddaa5cd320064a4',
  tail: '9ad2c5c966f399bdcd0b61e144f02840' }
```

Much like as in Git to restore a specific reference or commit:

```js
doc.checkout('patch-1');
```

This time the reconstructed document, containing additional operations of a patch, looks like this:

```js
{ properties: {},
  nodes: 
   { '8bb75cd271ea1643e55ae781d7459a2a': 
      { type: 'section',
        properties: [Object],
        id: '8bb75cd271ea1643e55ae781d7459a2a',
        prev: null,
        next: null },
     db386446d62ea8150bbe1b303ab65412: 
      { type: 'text',
        properties: [Object],
        id: 'db386446d62ea8150bbe1b303ab65412',
        prev: '8bb75cd271ea1643e55ae781d7459a2a',
        next: null },
     b5f309cc0d2c9e34604891e8dd76ae17: 
      { type: 'text',
        properties: [Object],
        id: 'b5f309cc0d2c9e34604891e8dd76ae17',
        prev: 'db386446d62ea8150bbe1b303ab65412',
        next: null },
     fda8b680672bb9b0df073330a6a26e49: 
      { type: 'text',
        properties: [Object],
        id: 'fda8b680672bb9b0df073330a6a26e49',
        prev: 'b5f309cc0d2c9e34604891e8dd76ae17',
        next: null } },
  head: '8bb75cd271ea1643e55ae781d7459a2a',
  tail: 'fda8b680672bb9b0df073330a6a26e49' }
```


Finally, Michael discovers the patch and he wants to bring in those changes.

```js
Patch.apply(document, history, patch);
doc.merge()
```

Behind the scenes the following happens:

1. The current head gets checked out

2. Operations of branch `patch-1` get applied

3. If everything goes right, the head pointer is set to the latest commit of `patch-1`

Depending on the actual situation this merge operation might fail, and require manual conflict resolution. We'll implement conflict resolution in a later version of the library.


### Annotations

Let's add a annotation comment at this point.

```js
var commentOnSection = {
  "rev": 1,
  "user": "michael",
  "id": "open-collab",
  "content": "This is a hello world document. Nothing too fancy."
};

// Annotations are maintained externally.
var annotations = new Annotations(doc);

annotations.add(commentOnSection);
```

Side note: Once you initialize an annotation object on a document it listens for document updates and updates annotations accordingly. E.g. if a node is deleted etc. The crucial point here is that the document doesn't know anything about its annotations, they're kept fully external. Annotations always belong to the head version of a document, and get updated if the head changes.
