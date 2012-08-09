# Substance Document Model

Read the official documentation [here](http://interior.substance.io/modules/document.html), which gets updated on every major release.

## Document Manipulation API

A complete JSON-serialized version of a document looks like this:


```js
var doc = {
  "id": "hello-world",
  "user": "michael",
  "refs": {
    "master": "commit-4",
    "patch-1": "commit-3"
  },
  "commits": {
    "commit-1": {
      "op": ["node:insert", {"id": "section:hello", "type": "section", "properties": {"name": "Hello?"}}],
      "user": "michael",
      "parent": null
    },

    "commit-2": {
      "op": ["node:insert", {"id": "text:hello", "type": "text", "target": "section:hello", "properties": {"content": "Hello there."}}],
      "user": "michael",
      "parent": "commit-1"
    },

    "commit-3": {
      "op": ["node:insert", {"id": "text:p1", "type": "text", "target": "text:hello", "properties": {"content": "Ein erster Paragraph."}}],
      "user": "michael",
      "parent": "commit-2"
    },

    "commit-4": {
      "op": ["node:insert", {"id": "text:outro", "type": "text", "target": "text:hello", "properties": {"content": "This is the end."}}],
      "user": "michael",
      "parent": "commit-2"
    }
  }
}
```

Start tracking a document

```js
var doc = new Document(doc);
```

By default, the current head of your document gets reconstructed. So if you want to inspect the current state of your document, do this:


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
doc.merge('patch-1');
```

Behind the scenes the following happens:

1. The current head gets checked out

2. Operations of branch `patch-1` get applied

3. If everything goes right, the head pointer is set to the latest commit of `patch-1`

Depending on the actual situation this merge operation might fail, and require manual conflict resolution. We'll implement conflict resolution in a later version of the library. To move on fast we just added support for fast-forward merges.


### Annotations

Let's add an annotation (comment) at this point.

```js
var commentOnSection = {
  "rev": 1,
  "user": "michael",
  "id": "section:hello",
  "content": "This is a hello world document. Nothing too fancy."
};

// Annotations are maintained externally.
var annotations = new Document.Annotations(doc);

annotations.add(commentOnSection);
```

Side note: Once you initialize an annotation object on a document it listens for document updates and updates annotations accordingly. E.g. if a node is deleted etc. The crucial point here is that the document doesn't know anything about its annotations, they're kept fully external. Annotations always belong to the head version of a document, and get updated if the head changes.

Annotations can be serialized as JSON and reconstructed plus bound to the same document again, watching for updates. Don't forget to bind your annotation object to the document, whenever this gets manipulated. 

To backup your annotations:

```
var backup = annotations.toJSON();
```

Next time, do this:

```js
var doc = new Document(doc);

var annotations = new Document.Annotations(doc, backup);
```

Execute some commands:

```js
var doc.apply(op1); // e.g. delete node
var doc.apply(op2); // e.g. update contents of a text nodes
```

If everything goes right, your annotation ranges should be updated accordingly. These are non-trivial operations and it will take us a while to implement this and make it stable.

**Edge cases**

- A node gets deleted, what happens to the annotations pointing to that node? Should it get deleted? Should it get assigned to the document level?
- The content of a text node change in such a way that all the refenced characters get deleted. Thus the annotation should be deleted as well, or marked as unassigned.


# Document manipulation by example

Start tracking a new document.

```js
var doc = new Document({ id: "document:substance" }, substanceDocSchema);
```

### Insert Section

```js
var opA = {
  "op": ["node:insert", {"id": "section:a", "type": "section", "properties": {"name": "Substance Document Model"}}],
  "user": "michael",
  "parent": "null"
};
doc.apply(opA);
```

### Insert Text

```js
var opB = {
  "op": ["node:insert", {"id": "text:a", "type": "text", "properties": {"content": "Substance Document Model is a generic format for representing documents including their history."}}],
  "user": "michael"
}
doc.apply(opB);
```

### Add a new annotation

Now we'd like to store additional contextual information, like a comment refering to a portion of text within the document. Let's add a comment explaining the word **Substance**. But first, we need to track an annotations object. The annotations object is just another Substance Document, using a different schema. They don't hold text nodes, sections etc. but `comments`, `links`, `ems`, and `strongs`.

```js
var annotations = new Document({ id: "annotations:substance" }, substanceAnnotationSchema);
```

Now we're ready to apply our annotations operation.

```js
var op1 = {
  "op": ["node:insert", {"id": "annotation:1", "type": "annotation", "pos": [4, 13], properties": {"content": "The Substance Document Model is a generic format for representing documents including their history."}}],
  "user": "michael"
}
annotations.apply(op1);
```

Before we do that... Let's recap for a moment. We have a document containing two nodes (a section and a text element) and we have an annotations document holding a comment.

Or document operations graph looks like this:

```js
{
  "id": "document:substance",
  "user": "michael",
  "refs": {
    "master": "commit-4",
    "patch-1": "commit-3"
  },
  "operations": {
    "op-a": {
      "op": ["node:insert", {"id": "section:hello", "type": "section", "properties": {"name": "Hello?"}}],
      "user": "michael",
      "parent": null
    },

    "op-b": {
      "op": ["node:insert", {"id": "text:hello", "type": "text", "target": "section:hello", "properties": {"content": "Hello there."}}],
      "user": "michael",
      "parent": "op-a"
    }
  }
}
```

And our annotations graph looks like this:

```js
{
  "id": "annotations:substance",
  "user": "michael",
  "refs": {
    "master": "commit-4",
    "patch-1": "commit-3"
  },
  "commits": {
    "commit-1": {
      "op": ["node:insert", {"id": "section:hello", "type": "section", "properties": {"name": "Hello?"}}],
      "user": "michael",
      "parent": null
    }
  }
}
```

### Update text

Now things get a little tricky, since once we change the contents of the text node the position of the associated annotation will be wrong.

```js
var opC = {
  "op": ["node:update", {"node": "text:a", "delta": "ins('The ') ret(100)"}],
  "user": "michael"
}

doc.apply(opC);
```

So we need a mechanism to keep the annotations in sync with the plain text. Let's assume there is a neat helper that does that for us. And we could just use it like so:

```js
var transformer = new AnnotationTransformer(doc, annotations);
```

This piece just listens to completed document operations, checks if there are annotations affected and if that's the case, magically create operations on the annotations document to update the positions. 

```js
var op1 = {
  "op": ["node:update", {"node": "annotation:1", "pos": [4, 13]}],
  "user": "michael"
};
annotations.apply(op1);
```

By having delta updates on the anotation level allows us to walk back in time to a particular document state, and also see the annotations that existed at that same point in time. We'll show later how to do time travels based on the operations history.

