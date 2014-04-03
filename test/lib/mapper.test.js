
var EventEmitter = require('events').EventEmitter;
var Model = require('beyo-model').Model;
//var Types = require('beyo-model').Types;

var Connections = require('../../lib/connections');
var Mapper = require('../../lib/mapper');

describe('Mapper Test', function () {

  before(function () {
    Model.define('Test', {
      attributes: {
        id: 'int',
        text: 'text'
      }
    });

    Connections.registerAdapter('test', function * () {

    });

    Connections.define('test', 'test://');
  });


  it('should initialize', function () {
    var mapper = Mapper.define('Test1');

    mapper.should.be.an.Object.and.be.instanceof(EventEmitter);
    mapper.__proto__.constructor.name.should.equal('Test1Mapper');
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

    var model = new mapper.Model({ id: 1, text: 'Hello world' });

    model.should.be.an.Object.and.be.instanceof(Model.get('Test'));

    model.foo('Hello world!');
  });

  it('should fail defining model', function () {

    (function () {
      Mapper.define('Test6a', {
        model: 'Test'
      });
    }).should.throw();

    (function () {
      Mapper.define('Test6b', {
        model: {
          type: 'InvalidType',
          methods: true
        }
      });
    }).should.throw();

    (function () {
      Mapper.define('Test6c', {
        model: {
          type: 'Invalid Type',
          methods: true
        }
      });
    }).should.throw();

    (function () {
      Mapper.define('Test6e', {
        model: {
          type: 'Test',
          methods: true
        }
      });
    }).should.throw();

    (function () {
      Mapper.define('Test6f', {
        model: {
          type: 'Test',
          methods: {
            foo: 'Boo!'
          }
        }
      });
    }).should.throw();

  });

  it('should pass options', function () {
    var mapper = Mapper.define('Test7', {
      options: true
    });

    mapper.options.should.be.Boolean.and.equal(true);
  });

  it('should receive a valid connection');

  it('should fail with an invalid connection', function () {



  });

});
