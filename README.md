Substance Document Format
========

The *Substance Document Format* (a work in progress) aims to be a quasistandard for representing arbitrary digital documents. It doesn't make any assumptions on a concrete type or structure. Instead it is supposed to be a foundation to create your own document model on top of it, tailored to your particular use-case. A Substance document model can range from loosly structured documents involving sections and text, such as reports or articles to things that you wouldn't consider a document anymore but in fact are. Let's take the mess of filling out forms as an example. The reason why we are still filling them out by hand and manually transfer them into a database system is simply the lack of suitable generic document representations and form composition tools. In many we are dealing with a mixture of structured and unstructured parts. There might be a disclaimer with is not editable in conjunction with a person's contact info. That's the challenge. However, most of today's web-based forms are created on a tight budget. As a result they not only look ugly, they are also incredibly error-prone. After carefully filling out that one important form for half an hour and submitting it, you're usually rewarded with a message that says something like this:

> Sorry your session has been expired. Or in other words, you were to slow. But no worries, if you click here you can safely fill it out again. From scratch of course.

Or does that just happen to me? :) Okay, it's not always that bad. But the only systems that are fun to use, are at the same time the most simple ones. I'd consider Twitter as such an example. Too bad the world's knowledge can't be represented in a 255 characters plain-text field. So we need to deal with a (manageable) amount of complexity. The Substance Stack helps you with that. And much more. And we take this mission very seriously.

We're not giving you a solution for your particular problem. But we provide you a simple framework you can use to define a document model, plus a [building block](http://github.com/substance/composer) to create your own editor for manipulating those documents.


A Substance Document consists of a list of a content nodes that are linked together. Each node points to its successor and predecssor nodes. Nesting is not supported, for good reason.

A concrete instance of a Substance document could look like so:

```js
{
  "id": "/document/hello_world",
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
}
```

However keep in mind, that there are no assumptions on your node types. They are defined by a schema you can define. 

Schema
========

For the document shown above the schema looks like this.
Here's an example 

```js
{
  "/type/cover": {
    "type": "/type/type",
    "name": "Cover",
    "properties": {
      "title": {
        "name": "Document Title",
        "unique": true,
        "type": "string",
      },
      "abstract": {
        "name": "Abstract",
        "type": "string"
      }
    }
  },
  "/type/text": {
    "type": "/type/type",
    "name": "Text",
    "properties": {
      "content": {
        "type": "string",
      },
      "direction": {
        "type": "string"
      }
    }
  }
}
```


Application Examples
========

Here are some less obvious, but perfectly valid applications of the Substance Document Model. Use it as an inspiration for your own document model.


Picture Gallery
--------

Use the Substance Document Model to model a picture-gallery, complete with title, description and an arbitrary number of pictures (each one having a title).

Here's how the schema for such a document could look like:

```js
{
  "/type/cover": {
    "type": "/type/type",
    "name": "Cover",
    "properties": {
      "title": {
        "name": "Gallery name",
        "unique": true,
        "type": "string",
      },
      "description": {
        "name": "Description",
        "type": "string"
      },
      "created_at": {
        "name": "Created at",
        "type": "date"
      },      
    }
  },
  "/type/picture": {
    "type": "/type/type",
    "name": "Picture",
    "properties": {
      "image_url": {
        "type": "string"
      },
      "thumb_url": {
        "type": "string"
      },
      "caption": {
        "type": "string"
      }
    }
  }
}
```

Your picturegallery editor could look like this.

Instead of creating a propriatory data representation format and database model (there might be millions of picturegallery variations around) you just transform the Picturegallery document using commands.

For inserting a new picture a command would look like so:

```js
{
  "command": "node:insert", 
  "params": {
    "user": "michael",
    "type": "picture",
    "rev": 3,
    "attributes": {
      "image_url": "http://server.com/path/to/image",
      "thumb_url": "http://server.com/path/to/thumb",
      "caption": "That new image"
    }
  }
}
```

If you were to change to title of the gallery, an update command does it.

All this can take place in the browser. At the end of the day you have a document that just contains the information you need. Store it whereever you want. Load it whenever you need it. And do further transformations. In fact this is not so much different from what you're used to do, except it unifies the process and separates tasks such as modelling the data and manipulating data (using commands).


Micropage
--------

Say you want to offer your customer an easy way to build micropages, based on a template. He just needs to fill out some bits that vary from page to page and based on that information it can be transformed into a static webpage using that pre-defined template.
