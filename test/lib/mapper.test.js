
var EventEmitter = require('events').EventEmitter;
var Model = require('beyo-model').Model;
//var Types = require('beyo-model').Types;

var Connections = require('../../lib/connections');
var Mapper = require('../../lib/mapper');

describe('Mapper Test', function () {

  var modelOptions = {
    attributes: {
      id: 'int',
      text: 'text'
    }
  };

  before(function () {
    Model.define('Test', modelOptions);

    Connections.registerAdapter('test', function * () {
      return 'TestAdapter';
    });

    Connections.define('test', 'test://');
  });


  it('should initialize', function () {
    var mapper;

    Mapper.isDefined('Test1').should.be.false;

    (function () { Mapper.get('Test1'); }).should.throw();

    mapper = Mapper.define('Test1');
    mapper.should.be.an.Object.and.be.instanceof(EventEmitter);
    mapper.__proto__.constructor.name.should.equal('Test1Mapper');

    Mapper.isDefined('Test1').should.be.true;
  });

  it('should fail initializing', function () {
    [
      undefined, null, false, true, '', 'INVLID NAME', {}, [], function () {}
    ].forEach(function (mapperName) {
      (function () { Mapper.define(mapperName); }).should.throw();
    });

    (function () {
      Mapper.define('Test1a', {
        methods: 'fail'
      });
    }).should.throw();

    (function () {
      Mapper.define('Test1b', {
        methods: {
          foo: 'Test fail'
        }
      });
    }).should.throw();

  });

  it('should not override another mapper', function () {
    Mapper.define('Test2');

    (function () {
      Mapper.define('Test2');
    }).should.throw();
  });

  it('should return defined mapper', function () {
    var mapper = Mapper.define('Test3');

    Mapper.get('Test3').should.equal(mapper);
  });

  it('should fail returning mapper', function () {
    [
      undefined, false, true, null, 0, '', /foo/, {}, [], function () {}
    ].forEach(function (mapperName) {
      (function () { Mapper.isDefined(mapperName); }).should.throw();
      (function () { Mapper.get(mapperName); }).should.throw();
    });
  });

  it('should have operations', function () {
    var mapper = Mapper.define('Test4', {
      methods: {
        foo: fooOperation,
        bar: barOperation
      }
    });
    var testObj = { hello: 'World', suffx: '!' };

    function fooOperation() {
      this.should.equal(mapper);
    }
    function barOperation(a, b, c) {
      this.should.equal(mapper);
      a.should.be.a.Boolean.and.be.true;
      b.should.be.a.String.and.equal('Hello');
      c.should.be.an.Object.and.be.equal(testObj);
    }

    mapper.foo();
    mapper.bar(true, 'Hello', testObj);
  });

  it('should define model', function () {
    var mapper = Mapper.define('Test5', {
      model: {
        type: 'Test',
        methods: {
          foo: function (msg) {
            this.should.an.instanceof(Model.get('Test')).and.be.equal(model);
            msg.should.be.equal('Hello world!');
          }
        }
      }
    });

    mapper.Model.mapper.should.equal(mapper);

    var model = new mapper.Model({ id: 1, text: 'Hello world' });

    model.should.be.an.Object.and.be.instanceof(Model.get('Test'));
    model._mapper.should.equal(mapper);

    model.foo('Hello world!');
  });

  it('should fail defining model', function () {

    Model.define('Test6', modelOptions);

    (function () {
      Mapper.define('Test6a', {
        model: 'Test'
      });
    }).should.throw();

    (function () {
      Mapper.define('Test6b', {
        model: {
          type: 'InvalidType'
        }
      });
    }).should.throw();

    (function () {
      Mapper.define('Test6c', {
        model: {
          type: 'Test6',
          methods: true
        }
      });
    }).should.throw('Model methods must be an object');

    (function () {
      Mapper.define('Test6d', {
        model: {
          type: 'Test',
        }
      });
    }).should.throw('Model `Test` already has mapper');

    (function () {
      Mapper.define('Test6e', {
        model: {
          type: 'Test6',
          methods: []
        }
      });
    }).should.throw('Model methods must be an object');

    (function () {
      Mapper.define('Test6f', {
        model: {
          type: 'Test6',
          methods: {
            foo: 'Boo!'
          }
        }
      });
    }).should.throw('Method `foo` must be a function');

  });

  it('should pass options', function () {
    var mapper = Mapper.define('Test7', {
      options: true
    });

    mapper.options.should.be.Boolean.and.equal(true);
  });

  it('should receive a valid connection', function * () {
    var mapper = Mapper.define('Test8a', {
      connection: 'test'
    });
    var adapter;

    mapper.should.have.property('_connectionName').and.be.equal('test');
    mapper.should.have.property('getAdapter').and.be.a.Function;

    adapter = yield (mapper.getAdapter)();
    adapter.should.be.a.String.and.equal('TestAdapter');
  });

  it('should fail with an invalid connection', function () {
    [
      'invalid connection'
    ].forEach(function (connection, i) {
      (function () {
        Mapper.define('Test9' + i, {
          connection: connection
        });
      }).should.throw();
    });
  });

  it('should register with namespace', function () {
    Mapper.define('namespace.test.Test9');

  });

});
