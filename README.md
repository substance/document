# Substance Document Model

The **Substance Document Model** is a standard for representing and programmatically manipulating *digital* documents. It doesn’t make any assumptions on a concrete type or structure. Instead it is supposed to be a foundation to create your own document model on top of it, tailored to your particular use-case. A Substance document model can range from loosly structured documents involving sections and text, such as reports or articles to things that you wouldn’t consider a document anymore but in fact are.

We've put a lot of thoughts into the design of this module. This first release is a result of almost 6 months of research and development.

## Design goals

- A document consists of a sequence of content nodes of different types (e.g. heading, text, image)
- A document is maniupulated through atomic **operations**
- The **history** is tracked, so users reconstruct previous document states at any time
- Support for incremental text updates, using a protocol similar to [Google Wave](http://www.waveprotocol.org/whitepapers/operational-transform)
- Support for text **annotations** that are not part of the content, but rather an overlay
- Support for **comments** to have dicussions on three levels (document, node, and also on a particular text annotation)

Without too much talking, just have a look at it yourself. The Substance Console allows you to explore some examples and mess around with the document manipulation protocol in a playful manner.


## Getting started

This section is intended to be a step to step guide on how to use the module to programmatically create and transform digital documents of any kind.

#### Start tracking a new document.

```js
var doc = new Substance.Document({ id: "document:substance" });
```

#### First off, let's specify a human readable title for our document

```js
var op = ["set", {
  "title": "The Substance Document Model"
}];

doc.apply(op, {"user": "michael"});
```

#### Add a first heading to our document.

```js
var opA = ["insert", {
  "id": "section:1",
  "type": "section",
  "target": "back",
  "data": { "content": "Hello" }
}];

doc.apply(opA, {"user": "michael"});
```

#### Now let's add another node, this time a text node.

This operation is pretty similar to the previous one, except this time we specify `text` as our type.

```js
var opB = ["insert", {
  "id": "text:2",
  "type": "text",
  "data": { "content": "Hey there." }
}];

doc.apply(opB, {"user": "michael"});
```

#### Update an existing node

There's a special API for incrementally updating existing nodes. This works by specifying a delta operation describing only what's changed in the text.

```js
var opC = ["update", {
    "id": "section:1",
    "data": [["ret", 5], ["ins"," world!"]]
}]

doc.apply(opC, {"user": "michael"});
```

#### Inspect the document state

Now after executing a bunch of operations, it is a good time to inspect the current state of our document.

```js
doc.content
```

By accessing the `content` property you can always access that information.

```js
{
  "head": "section:1",
  "tail": "text:2"
  "properties": {"title": "The Substance Document Model"},
  "nodes": {
    "section:1": {
      "content": "Hello world!",
      "id": "section:1",
      "type": "section",
      "prev": null,
      "next": "text:2"
    },
    "text:2": {
      "content": "Hey there.",
      "id": "text:2",
      "type": "text",
      "prev": "section:1",
      "next": null
    }
  },
  "annotations": {},
  "comments": {}
}
```

As you can see there are two nodes registered, which can be directly accessed by their `id`. In order to reflect the order of our nodes each of them knows about its `next` and `prev` sibling. On the document level there's two additional properties `head` and `tail`, which point to the beginning and the end of the document.


#### History

But we don't only have access to the current state, the document model keeps track of all operations that have been executed.

```js
doc.toJSON();
```

Now this is the slightly more verbose output of the complete history of that same document. It wraps every operation in a commit object, each having a GUID as well as a reference to the previous commit.

```js
{
  "refs": {
    "master": "f7bd8120adb16d179c454ce57b57b50d"
  },
  "operations": {
    "1b6544d5f9724c33aa8dbb5becc51c0d": {
      "op": [
        "insert",
        {
          "id": "section:1",
          "type": "section",
          "target": "back",
          "data": {"content": "Hello"}
        }
      ],
      "user": "michael",
      "sha": "1b6544d5f9724c33aa8dbb5becc51c0d"
    },
    "b0595f2d3863db5ecd82d43e7ec05da0": {
      "op": [
        "insert",
        {
          "id": "text:2",
          "type": "text",
          "target": "back",
          "data": {"content": "Hey there."}
        }
      ],
      "user": "michael",
      "sha": "b0595f2d3863db5ecd82d43e7ec05da0",
      "parent": "1b6544d5f9724c33aa8dbb5becc51c0d"
    },
    "f7bd8120adb16d179c454ce57b57b50d": {
      "op": ["update", {"id": "section:1", "data": [["ret",5],["ins"," world!"]]}],
      "user": "foouser",
      "sha": "f7bd8120adb16d179c454ce57b57b50d",
      "parent": "b0595f2d3863db5ecd82d43e7ec05da0"
    }
  },
  "additions": {},
  "id": "doc:hello"
}
```

#### Time travel

Keep in mind, we can always look back. According to the commit graph shown above, we can checkout any reference in our d

```js
doc.apply(opC, {"user": "michael"});
```

#### Construct an existing document

Alternatively, you can pass in the history of an existing document, by providing all operations that happenend on that document, which are used to reconstruct the latest document state.

The document must come in this format.

```js
{
  "id": "DOCUMENT_ID",
  "commits": {}, // Commit history containing all operations applied on that document
  "additions": {} // Assigns to certain commits document additions, such as annotations and comments
}
```

```js
var doc = new Substance.Document(docSpec);
```


#### Annotations

Now we'd like to store additional contextual information, like a comment refering to a portion of text within the document. Let's add a comment explaining the word **Substance**. But first, we need to track an annotations object. The annotations object is just another Substance Document, using a different schema. They don't hold text nodes, sections etc. but `comments`, `links`, `ems`, and `strongs`.


Now we're ready to apply our annotations operation.

```js
var op1 = {
  "op": ["insert", {"id": "annotation:1", "type": "annotation", "pos": [0, 9], "properties": {"content": "The Substance Document Model is a generic format for representing documents including their history."}}],
  "user": "michael"
}
annotations.apply(op1);
```

## Supported Operations

### Document

#### Insert Node

Parameters:

- `id` - Unique id of the element
- `type` - Type of the new node
- `properties` (optional) - All properties that need to be stored on the node

Inserting a text node.

```js
["insert", {"id": "text:e", "type": "text", "properties": {"content": "The end."}}]
```

#### Update Node

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

#### Move Node(s)

Parameters:

- `nodes` - Node selection that should be moved to a new location
- `target` - Target node, selection will be appended here

```js
["move", {"nodes": ["section:hello", "text:hello"], "target": "text:hello"}]
```

#### Delete Node(s)

Parameters:

- `nodes` - Node selection that should be removed from the document

```js
["delete", {"nodes": ["text:hello"]}]
```