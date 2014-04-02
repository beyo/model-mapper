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
    tableName: 'inv_items'
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