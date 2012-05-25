Substance Document Format
========

The Substance Document Format (a work in progress) aims to be a quasistandard for representing arbitrary digital documents. It doesn't make any assumptions on a concrete type or structure. Instead it is supposed to be a foundation to create your own document model on top of it, tailored to your particular use-case. A Substance document model can range from loosly structured documents involving sections and text, such as reports or articles to things that you wouldn't consider a document anymore but in fact is. You know what a form is? Then you know the mess. The reason why we are still filling out forms by hand and manually transfer them into a database system is simply the lack of suitable generic document representations. In many you are dealing with a mixture of structured and unstructured parts. There might be a disclaimer with is not editable in conjunction with a person's contact info . Most web-based forms are created on a tight budget. As a result they not only look ugly, u and are error-prone. After carefully filling out that one form for half an hour and submitting it, you're usually rewarded with a message that looks like so:

> Sorry your session has been expired. Or in other words, you were to slow. But no worries, if you click here you can safely fill it out again. From scratch of course.

Or does that just happen to me? :) The Substance Document helps you to manage that mess. And much more.

The Substance Stack is not giving you a solution for your particular problem. But it gives you a framework you can use to define a document model, plus provides building blocks to build your own editor to manipulate those documents.


Examples
--------

A webpage can also be considered a document. Say you want to offer your customer an easy way to build micropages, based 

A Substance Document consists of a list of a document nodes, that are linked together. Each node points to its successor and predecssor nodes. Nesting is not supported, for good reason. 

A concrete instance of a Substance document could look like so:

```js
{
  "id": /document/hello_world,
  "created_at": "2012-04-10T15:17:28.946Z",
  "updated_at": "2012-04-10T15:17:28.946Z",
  "head": "/cover/1",
  "tail": "/section/2",
  "rev": 3,
  "nodes": {
    "/cover/1": {
      "type": ["/type/node", "/type/cover"],
      "title": "Hello World",
      "abstract": "",
      "next": "/text/2",
      "prev": null
    },
    "/text/2": {
      "type": ["/type/node", "/type/text"],
      "name": "This is an instance of a text node",
      "prev": "/cover/1",
      "next": null
    }
  }
};
```

However keep in mind, that there are no assumptions on your node types. They are defined by a schema you can define. 

Schema
========

For the document shown above the schema looks like this.
Here's an example 

```js
{
  "/type/text": {
    "_id": "/type/text",
    "type": "/type/type",
    "name": "Text",
    "properties": {
      "content": {
        "name": "Content",
        "unique": true,
        "type": "string",
        "default": "<p></p>"
      },
      "direction": {
        "name": "Direction",
        "unique": true,
        "type": "string"
      }
    }
  }
}
```