## Beyo Model Mapper

Data mappers for beyo models


## Preamble

This module is *not* an ORM. It is a DI abstraction layer for models, but still
allowing projects to manually access the persistence layer and optimize data access.


## Install

```
npm install beyo-model-mapper
```


## Usage

```javascript
// declare
var mapper = Mapper.define('Foo', {    // define "FooMapper"
  model: {
    type: 'Foo',       // must be a defined model (see beyo-model)
    methods: {
      save: function * () {
        if (this is a new model) {
          return yield mapper.create(this);
        } else {
          return yield mapper.update(this);
        }
      }
    }
  },
  connection: 'postgre',
  options: {
    /* whatever options */
  },
  methods: {
    create: createModel,
    find: findModel,
    findAll: findAllModels,
    update: updateModel,
    delete: deleteModel
  }
});


function * createModel(model) {
  // create new model and return it
}

function * findModel(filter) {
  // find the first model matching `filter` and return it
}

function * findAllModels(filter) {
  // find all models matching `filter` and return a Collection
}

function * updateModel(model) {
  // update model `model` and return it
}

function * deleteModel(model) {
  // delete model `model` and return success state
}
```

```javascript
// fetching the mapper
var fooMapper = Mapper.get('Foo');

// fetching the model mapper
var FooModel = Model.get('Foo');
var foo = FooModel();   // new instance

// foo._mapper === FooModel.mapper === fooMapper

foo.save();
```


## Mapper

A mapper's purpose is to bind a model to a persistence storage.

**NOTE** : A model bound to a mapper cannot be bound again with another mapper.


### Mapper Public API

* **define** *(mapperName:String, options:Object)*:*{Mapper}* - define a new mapper
and return it
* **get** *(mapperName:String)*:*{Mapper}* - return a defined mapper, or throw an
exception is the mapper does not exist
* **isDefined** *(mapperName:String)*:*{Boolean}* - check if a mapper is defined


### Mapper Options

* **model**:*{Object}* - the mapped model options. The model class (model type) will
be extended with a static property `mapper, and the prototype with a property
`_mapper`, which returns the defining mapper instance for the model.
  * **type**:*{String}* - the model type (must be already defined, see
    [Model.define](https://github.com/beyo/model#models).
 * **methods**:*{Object}* - *(optional)* the methods to add to the model's prototype.
   This option behaves like the mapper's `methods` options, but methods are added
   to the model's prototype.
* **options**:*{mixed}* - any value that will be mixed with the mapper's prototype.
* **connection**:*{String}* - the defined connection name. Defining this option
  will add `_connectionName`, the connection name as string, and `getAdapter()`, a
  yieldable function returning the define connection adapter's client (see
  [Connections.define](#connections-api)), to the
  mapper's prototype
* **methods**:*{Object}* - an object mapping the methods to add to the mapper's
  prototype. Typically, all the basic CRUD methods should be defined here. For
  example, `create`, `find`, `update`, and `delete`.


## Connections

To facilitate connection pooling and management, the `Connections` class act as a
connection registry for mappers. In such, mappers will make use of this registry
to return their persistence storage adapter.

For example, for [PostgreSQL](https://github.com/brianc/node-postgres) :

```javascript
var suspend = require('co-suspend');
var pg = require('pg');
var mapper;

Connections.registerAdapter('postgres', function * memoryAdapter(info) {
  // info = {
  //   source: 'postgres://user:pass@host/dbname',
  //   type: 'postgres',
  //   user: 'user',
  //   pass: 'pass',
  //   host: 'host',
  //   dbname: 'dbname'
  // }
  var marker = suspend();

  pg.connect(info.source, function(err, client, done) {
    marker.resume(err, client);
    done();
  });

  return yield marker.wait(3000);  // wait 3 seconds for connection
});

Connections.define('fooConnection', 'postgres://user:pass@host/dbname')

mapper = Mapper.define('Foo', {
  connection: 'fooConnection'
});

var client = yield (mapper.getAdapter)();
```


### Connections Public API

* **registerAdapter** *(name:String, factory:Function)* - register a new client
  adapter factory. The `factory` should be a yieldable function and should return
  the client storage object that the mapper can use to perform basic CRUD operatons.
* **isAdapterRegistered** *(name:String)*:*{Boolean}* - return true if the adapter
  factory is defined.
* **unregisterAdapter** *(name:String)* - unregister an adapter factory. This
  method does not perform any check and this may break mappers using a connection
  for the specified adapter factory!
* **define** *(name:String, conStr:String)* - define a new named connection string
  usable by mappers. The connection string should have the format 'adapter://user:pass@host/dbname',
  where `adapter` is the registered adpater factory. All other values are optional,
  but should follow the format is specified.
* **isDefined** *(name:String)*:*{Boolean}* - returns true if the named connection exists.
* **get** *(name:String)*:*{mixed}* - a yieldable function returning the adapter's factory
  client instance.
* **undefine** *(name:String)* - undefine a named connection.


## Contribution

All contributions welcome! Every PR **must** be accompanied by their associated
unit tests!


## License

The MIT License (MIT)

Copyright (c) 2014 Mind2Soft <yanick.rochon@mind2soft.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
