# Interaction with Substance Text and Surface

```js
var text = new Substance.Text({content: "Helo world", annotations: {}});
```

We need more course grained-operations to be issued by Surface as we'll get too many operations if we track a commit for every keystroke being made. However Surface does not need to deal with operational transformation or keeping history. That's all done on a document level. All it has to do is turning a changeset into a compound text operation (`ret(4) ins('abc') ret(10)` etc.)

Let's say we have this situation.

- Content: "Helo world"

Let's assume the user does this:

1. Adds a "!" to the end
2. Adds an "l" at position 3.
3. Adds an annotation (em) to world (start: 5 end: 10)

Let's try to make Surface lazy, so it can keep its own state in sync on a keystroke level, but talk to the document level if the user is either moving the focus somewhere else (e.g. selects a different node on the Substance document) or the user interacts with the annotations (either adds a new annotation or deletes one). If we do that we can always "commit" the changes as a compound text operation, plus an annotation operation which is optional.

Operations (or events sent to the outside world = document):

First, the compound text manipulation:

```js
["text:update", "ret(3) ins('l') ret(7) insert('!')"]
```

Side hint: Tim knows how to extract an OT operation from a changeset. So we have these two text versions.

`Helo world` -> `Hello world!`

Second, the all new annotation:

```js
["annotation:insert", {"type": "em", pos: [5, 10]}]
```

By listening to those events on the active text element we can trigger the equivalents on the document level, and apply them.

```js
doc.apply({
  "op": ["node:update", {"node": "text:a", "delta": "ret(3) ins('l') ret(7) insert('!')"}],
  "user": "michael"
});
```

And here's the corresponding operatation that is being applied on the annotations document.

```js
annotations.apply({
  "op": ["node:insert", {"type": "em", "properties": {"pos": [5,10]}}],
  "user": "michael"
});
```
