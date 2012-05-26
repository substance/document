Substance Document Model
========

The *Substance Document Model* (a work in progress) aims to be a quasi-standard for representing arbitrary digital documents. It doesn't make any assumptions on a concrete type or structure. Instead it is supposed to be a foundation to create your own document model on top of it, tailored to your particular use-case. A Substance document model can range from loosly structured documents involving sections and text, such as reports or articles to things that you wouldn't consider a document anymore but in fact are. Let's take the mess of filling out forms as an example. The reason why we are still filling them out by hand and manually transfer them into a database system is simply the lack of suitable generic document representations and form composition tools. In many cases we are dealing with a mixture of structured and unstructured parts. There might be a disclaimer, which is not editable in conjunction with a person's contact info plus a list of purchased items. Most of today's web-based forms are created on a tight budget. As a result they not only look ugly, they are also incredibly error-prone. After carefully filling out that one important form for half an hour and submitting it, you're usually rewarded with a message that says something like this:

> Sorry your session has been expired. Or in other words, you were to slow. But no worries, if you click here you can safely fill it out again. From scratch of course.

Or does that just happen to me? :) Okay, it's not always that bad. But the only systems that are fun to use, are at the same time the most simple ones. I'd consider Twitter as such an example. Too bad the world's knowledge can't be represented within 140 characters plain-text. So we need to deal with a (manageable) amount of complexity. The Substance Stack helps you with that. And much more. And we take this mission very seriously.

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

However keep in mind, that there are no assumptions on your node types. They are defined by a document schema you can define. 

Document Schema
========

For the document shown above the schema looks like this.

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
      "filter_effect": {
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

Your picturegallery editor could look like this. If you're using the Substance Composer as a building block, picturegalleries can be composed collaboratively in realtime. No joke!

![Picturegallery Editor](http://f.cl.ly/items/3W3a2g38212C1M1m1z0z/Screen%20Shot%202012-05-25%20at%205.34.42%20PM.png)

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

If you were to change to title of the gallery, an update command should do it.

```js
{
  "command": "node:update", 
  "params": {
    "user": "michael",
    "rev": 4,
    "node": "/text/2",
    "attributes": {
      "title": "A new title"
    }
  }
}
```

All of this can take place in the browser. At the end of the day you have a document that just contains the information you need. Store it whereever you want. Load it whenever you need it. And do further transformations. In fact this is not so much different from what you're used to do, except it unifies the process and separates tasks such as modelling the data and manipulating it (using commands).


Micropage
--------

Say you want to offer your customer an easy way for building micropages, based on a template. He just needs to fill out some bits that vary from page to page and based on that information it can be transformed into a static webpage using that pre-defined template. No programming involved. A fully UI-driven workflow. So here's how this can be done using the Substance Document Model, and nothing else.

At Mapbox we're working on a template-driven approach for building map microsites. The pretty result (isn't it?) looks like this.

![Microsite](http://f.cl.ly/items/3a0S1N2t0J0h3Z453s0z/Screen%20Shot%202012-05-25%20at%206.12.01%20PM.png)

Okay here's a proposal on how this could be solved using the Substance Document Model:

First off, what dynamic information does our micropage contain?

- Title
- About
- Sheets (every Sheet shows a different aspect and can be reached through the site navigation)
  - Name
  - Baselayer
  - Center (lat, long, zoom)
  - Annotations (Markers)

Okay, let's see how this could be modelled as Substance Document.

```js
{
  "id": "/document/a_wider_circle_donations",
  "created_at": "2012-04-10T15:17:28.946Z",
  "updated_at": "2012-04-10T15:17:28.946Z",
  "head": "/cover/1",
  "tail": "/sheet/3",
  "rev": 43,
  "nodes": {
    "/cover/1": {
      "type": "/type/cover",
      "title": "A wider circle donations",
      "about": "About text goes here.",
      "next": "/sheet/2",
      "prev": null
    },
    "/sheet/2": {
      "type": "/type/sheet",
      "name": "A wider circle donations in 2000",
      "map": "http://a.tiles.mapbox.com/v3/mapbox.mapbox-light,mapbox.a-wider-circle-2000.jsonp",
      "center": {"lat": 32, "lng": 11, "zoom": 13 },
      "annotations": [],
      "prev": "/cover/1",
      "next": "/sheet/3"
    },
    "/sheet/3": {
      "type": "/type/sheet",
      "name": "A wider circle donations now in 2012",
      "map": "http://a.tiles.mapbox.com/v3/mapbox.mapbox-light,mapbox.a-wider-circle-2012.jsonp",
      "center": {"lat": 32, "lng": 11, "zoom": 13 },
      "annotations": [
        { "lat": 53.13, "lng": 41.87, "Why no dots?." },
        { "lat": 55.23, "lng": 43.45, "Lots of stuff going on here." }
      ],
      "prev": "/sheet/2",
      "next": null
    }
  }
}
```

The Microsite Editor (based on the Substance Composer) could have a WYSIWYG interface, providing a dropdown for switching the baselayer and handles for inline text editing (for the site's title as well as for the about text). 
Instead of manually updating the center coordinates + zoom level, why not just remembering the zoom position of the editor? By doing so, the page can easily be fine-tuned, without copy and pasting around numbers.

![Microsite WYSIWYG Editor](http://f.cl.ly/items/1l0P36230Y3b0n0v1042/micropage-wysiwyg-editor.png)

However, these are just rough sketches for the purpose of illustrating what can be done with the Substance Document Model.