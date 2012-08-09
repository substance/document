# Substance Document Model

Read the official documentation [here](http://interior.substance.io/modules/document.html), which gets updated on every major release.

## Document Manipulation API

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
  "op": ["node:insert", {"id": "annotation:1", "type": "annotation", "pos": [0, 9], properties": {"content": "The Substance Document Model is a generic format for representing documents including their history."}}],
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

#### Victor adds a patch

Now Victor is coming by. Since he is not authorized to change the documet directly, his operations will automatically go into a separate branch `victor-patch-1`. This works the same way as branches do in Git.

```js
var opD = {
  "op": ["node:update", {"node": "text:a", "delta": "ret(30) ins('evolutionary') ret(100)"}],
  "user": "victor"
};

doc.apply(opD);
```

#### Michael is back

Right after Victor has submitted his patch, Michael continutes to improve the document as well. He adds a conclusio.


```js
var opE = {
  "op": ["node:insert", {"id": "text:e", "type": "text", "properties": {"content": "The end."}}],
  "user": "michael"
};
doc.apply(opE);
```


#### Merge party

Michael now realizes that there's a new pending patch. First, he can just checkout the branch `victor-patch-1` to preview the changes. 

```js
doc.checkout('victor-patch-1');
```

Since everything looks good, Michael just merges in the changes.

```js
doc.merge('victor-patch-1');
```

Behind the scenes the following happens:

1. Checkout of the version right before victor applied the patch.

2. Apply Victors operation and let it point to the previous 

3. Apply Michael's operation (opE)

4. Set the master pointer to the latest commit.

Depending on the actual situation this merge operation might fail, and require manual conflict resolution. We'll implement conflict resolution in a later version of the library. To move on fast we just added support for fast-forward merges. So even the shown resolvable usecase is not yet supported.

