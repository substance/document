# Substance Document Model

The Substance Document Model aims to be a quasi-standard for representing arbitrary digital documents. It doesn’t make any assumptions on a concrete type or structure. Instead it is supposed to be a foundation to create your own document model on top of it, tailored to your particular use-case. A Substance document model can range from loosly structured documents involving sections and text, such as reports or articles to things that you wouldn’t consider a document anymore but in fact are.

Let’s take the mess of filling out forms as an example. The reason why we are still filling them out by hand and manually transfer them into a database system is simply the lack of suitable generic document representations and form composition tools. In many cases we are dealing with a mixture of structured and unstructured parts. There might be a disclaimer, which is not editable in conjunction with a person’s contact info plus a list of purchased items.

## Getting started

The Substance Document Model is essentially a Javascript framework that allows transforming digital documents in various ways.

#### Start tracking a new document.

```js
var doc = new Substance.Document({ id: "document:substance" }, substanceDocSchema);
```

Alternatively, you can pass in the history of an existing document, by providing all operations that happenend on that document, which are used to reconstruct the latest document state.

```js
var doc = new Substance.Document(operations, substanceDocSchema);
```

#### Insert Section

```js
var opA = ["insert", {"id": "section:a", "type": "section", "properties": {"name": "Substance Document Model"}}];

doc.apply(opA, {"user": "michael"});
```

#### Insert Text

```js
var opB = ["insert", {"id": "text:a", "type": "text", "properties": {"content": "Substance Document Model is a generic format for representing documents including their history."}}];

doc.apply(opB, {"user": "michael"});
```

Let's look at the state of our document, after those two operations have been applied.

```js
{
  "id": "document:substance",
  "nodes": {},
  "properties": {},
  "annotations": {},
  "comments": {}
}
```


#### Add a new annotation

Now we'd like to store additional contextual information, like a comment refering to a portion of text within the document. Let's add a comment explaining the word **Substance**. But first, we need to track an annotations object. The annotations object is just another Substance Document, using a different schema. They don't hold text nodes, sections etc. but `comments`, `links`, `ems`, and `strongs`.

```js
var annotations = new Document({ id: "annotations:substance" }, substanceAnnotationSchema);
```

Now we're ready to apply our annotations operation.

```js
var op1 = {
  "op": ["insert", {"id": "annotation:1", "type": "annotation", "pos": [0, 9], "properties": {"content": "The Substance Document Model is a generic format for representing documents including their history."}}],
  "user": "michael"
}
annotations.apply(op1);
```

Before we do that... Let's recap for a moment. We have a document containing two nodes (a section and a text element) and we have an annotations document holding a comment.

Our document operations graph looks like this:

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
      "op": ["insert", {"id": "section:hello", "type": "section", "properties": {"name": "Hello?"}}],
      "user": "michael",
      "parent": null
    }
  }
}
```

#### Update text

Now things get a little tricky, since once we change the contents of the text node the position of the associated annotation will be wrong.

```js
var opC = {
  "op": ["update", {id: "text:hello", "delta": [["ret", 2], ["ins", "l"], ["ret", 4], ["ins", "o"], ["ret", 3]]}],
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
  "op": ["update", {"node": "text:a", "delta": [["ret", 30], ["ins", "evolutionary"], ["ret", 100]]}],
  "user": "victor"
};

doc.apply(opD);
```

#### Michael is back

Right after Victor has submitted his patch, Michael continutes to improve the document as well. He adds a conclusion.


```js
var opE = {
  "op": ["insert", {"id": "text:e", "type": "text", "properties": {"content": "The end."}}],
  "user": "michael"
};
doc.apply(opE);
```

After all these operations our graph describing everything that happened looks like this:

![](https://raw.github.com/substance/document/master/assets/operations-graph-before-merge.png)

#### Merge party

Michael now realizes that there's a new pending patch. First, he can just checkout the branch `victor-patch-1` to preview the changes. 

```js
doc.checkout('victor-patch-1');
```

Since everything looks good, Michael just merges in the changes.

```js
doc.merge('victor-patch-1');
```

And we get this:

![](https://raw.github.com/substance/document/master/assets/operations-graph-after-merge.png)

Behind the scenes the following happens:

1. Checkout of the version right before victor applied the patch.

2. Apply Victors operation and let it point to the previous operation

3. Apply Michael's operation (opE)

4. Set the master pointer to the latest commit.

Depending on the actual situation this merge operation might fail and require manual conflict resolution. We'll implement conflict resolution in a later version of the library. To move on fast we just added support for fast-forward merges. So even the shown resolvable usecase is not yet supported.

## Supported Operations

### Insert Node

Parameters:

- `id` - Unique id of the element
- `type` - Type of the new node
- `properties` (optional) - 

Inserting a text node.

```js
["insert", {"id": "text:e", "type": "text", "properties": {"content": "The end."}}]
```

### Update Node

Parameters:

- `id` - Id of the node to be updated
- `properties` (optional) - Properties with new values
- `delta` (optional) - Only available for text nodes
- `target` (optional) - Can either be 'front', 'back' or the id of a target node

Updating a text node.

```js
["update", {id: "text:hello", "delta": [["ret", 2], ["ins", "l"], ["ret", 4], ["ins", "o"], ["ret", 3]]}]
```

Updating an image node.

```js
["update", {id: "image:hello", {"properties": "caption": "Hello World"}}]
```

### Move Node(s)

Parameters:

- `nodes` - Node selection that should be moved to a new location
- `target` - Target node, selection will be appended here

```js
["move", {"nodes": ["section:hello", "text:hello"], "target": "text:hello"}]
```

### Delete Node(s)

Parameters:

- `nodes` - Node selection that should be removed from the document

```js
["delete", {"nodes": ["text:hello"]}]
```