
describe('Mapper Test', function () {

  var EventEmitter = require('events').EventEmitter;
  var Model = require('beyo-model').Model;
  var co = require('co');
  var suspend = require('co-suspend');
  //var Types = require('beyo-model').Types;

  var Connections = require('../../lib/connections');
  var Mapper = require('../../lib/mapper');

  this.timeout(3000);


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


  it('should initialize', function * () {
    var mapper;

    Mapper.isDefined('Test1').should.be.false;

    (function () { Mapper.get('Test1'); }).should.throw();

    mapper = yield Mapper.define('Test1');
    mapper.should.be.an.Object.and.be.instanceof(EventEmitter);
    mapper.__proto__.constructor.name.should.equal('Test1Mapper');

    Mapper.isDefined('Test1').should.be.true;
  });

  it('should fail initializing', function * () {
    var markers = [];
    function newMarker() {
      var marker = suspend();
      markers.push(marker.wait());
      return marker;
    }

    [
      undefined, null, false, true, '', 'INVLID NAME', {}, [], function () {}
    ].forEach(function (mapperName) {
      var marker = newMarker();
      co(function * () {
        yield Mapper.define(mapperName);
      })(function (err) {
        err.should.be.an.Error;
        marker.resume();
      });
    });

    +function (marker) {
      co(function * () {
        yield Mapper.define('Test1a', {
          methods: 'fail'
        });
      })(function (err) {
        err.should.be.an.Error;
        marker.resume();
      });
    }(newMarker());

    +function (marker) {
      co(function * () {
        yield Mapper.define('Test1b', {
          methods: {
            foo: 'Test fail'
          }
        });
      })(function (err) {
        err.should.be.an.Error;
        marker.resume();
      });
    }(newMarker());

    yield markers;
  });

  it('should not override another mapper', function * () {
    var marker = suspend();

    yield Mapper.define('Test2');

    co(function * () {
      yield Mapper.define('Test2');
    })(function (err) {
      err.should.be.an.Error;
      marker.resume();
    });

    yield marker.wait();
  });

  it('should return defined mapper', function * () {
    var mapper = yield Mapper.define('Test3');

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

  it('should have operations', function * () {
    var mapper = yield Mapper.define('Test4', {
      methods: {
        foo: fooOperation,
        bar: barOperation
      }
    });
    var testObj = { hello: 'World', suffx: '!' };
    var fooInvoked = false;
    var barInvoked = false;

    function fooOperation() {
      this.should.equal(mapper);
      fooInvoked = true;
    }
    function barOperation(a, b, c) {
      this.should.equal(mapper);
      a.should.be.a.Boolean.and.be.true;
      b.should.be.a.String.and.equal('Hello');
      c.should.be.an.Object.and.be.equal(testObj);
      barInvoked = true;
    }

    mapper.foo();
    mapper.bar(true, 'Hello', testObj);

    fooInvoked.should.be.true;
    barInvoked.should.be.true;
  });

  it('should define model', function * () {
    var mapper = yield Mapper.define('Test5', {
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

  it('should fail defining model', function * () {
    var markers = [];
    function newMarker() {
      var marker = suspend();
      markers.push(marker.wait());
      return marker;
    }

    Model.define('Test6', modelOptions);

    +function (marker) {
      co(function * () {
        yield Mapper.define('Test6a', {
          model: 'Test'
        });
      })(function (err) {
        err.should.be.an.Error;
        marker.resume();
      });
    }(newMarker());

    +function (marker) {
      co(function * () {
        return yield Mapper.define('Test6b', {
          model: {
            type: 'InvalidType.Test6b'
          }
        });
      })(function (err, mapper) {
        Mapper.isMapper(mapper).should.be.true;
        +function () { mapper.Model; }.should.throw();
        marker.resume();
      });
    }(newMarker());

    +function (marker) {
      co(function * () {
        yield Mapper.define('Test6c', {
          model: {
            type: 'Test6',
            methods: true
          }
        });
      })(function (err) {
        err.should.be.an.Error;
        err.message.should.equal('Model methods must be an object');
        marker.resume();
      });
    }(newMarker());

    +function (marker) {
      co(function * () {
        yield Mapper.define('Test6d', {
          model: {
            type: 'Test',
          }
        });
      })(function (err) {
        err.should.be.an.Error;
        err.message.should.equal('Model `Test` already has mapper');
        marker.resume();
      });
    }(newMarker());

    +function (marker) {
      co(function * () {
        yield Mapper.define('Test6e', {
          model: {
            type: 'Test6',
            methods: []
          }
        });
      })(function (err) {
        err.should.be.an.Error;
        err.message.should.equal('Model methods must be an object');
        marker.resume();
      });
    }(newMarker());

    +function (marker) {
      co(function * () {
        yield Mapper.define('Test6f', {
          model: {
            type: 'Test6',
            methods: {
              foo: 'Boo!'
            }
          }
        });
      })(function (err) {
        err.should.be.an.Error;
        err.message.should.equal('Method `foo` must be a function');
        marker.resume();
      });
    }(newMarker());

    yield markers;
  });

  it('should pass options', function * () {
    var mapper = yield Mapper.define('Test7', {
      options: true
    });

    mapper.options.should.be.Boolean.and.equal(true);
  });

  it('should receive a valid connection', function * () {
    var mapper = yield Mapper.define('Test8a', {
      connection: 'test'
    });
    var adapter;

    mapper.should.have.property('_connectionName').and.be.equal('test');
    mapper.should.have.property('getAdapter').and.be.a.Function;

    adapter = yield mapper.getAdapter();
    adapter.should.be.a.String.and.equal('TestAdapter');
  });

  it('should fail with an invalid connection', function * () {
    var markers = [];
    function newMarker() {
      var marker = suspend();
      markers.push(marker.wait());
      return marker;
    }

    [
      'invalid connection'
    ].forEach(function (connection, i) {
      +function (marker) {
        co(function * () {
          yield Mapper.define('Test9' + i, {
            connection: connection
          });
        })(function (err) {
          err.should.be.an.Error;
          marker.resume();
        });
      }(newMarker());
    });

    yield markers;
  });

  it('should register with namespace', function * () {
    yield Mapper.define('namespace.test.Test9');
  });


  it('should return early intance', function * () {
    var mapper = yield Mapper.define('earlyIntance.mapper.Test10', {
      model: {
        type: 'earlyInstance.model.Test10'
      }
    });
    var MapperModel = Model.define('earlyInstance.model.Test10', modelOptions);

    mapper.Model.should.equal(MapperModel);
  });


  describe('Test events', function () {

    it('should emit events', function (done) {
      co(function * () {
        var events = new EventEmitter();
        var mapper = yield Mapper.define('TestEvent1', {
          methods: {
            foo: function (a, b, c) {
              Model.isModel(a).should.be.true;
              b.should.equal('Hello');
              c.should.equal('World');
            }
          },
          events: {
            emitter: events,
            pattern: 'foo.bar.{event}.{model.id}',
            mapping: {
              foo: 'fooEvent'
            }
          }
        });
        var model = Model.get('Test')({ id: 123 });

        events.once('foo.bar.fooevent.123', function (e) {
          e.action.should.be.equal('fooEvent');
          e.model.should.eql(model.toJSON());
          
          setImmediate(done);  // finalize
        });

        yield mapper.foo(model, 'Hello', 'World');

      })(function (err) {
        err && console.log("*** ERR", err.stack);
        assert.equal(err, null, 'err is null');
      });
    });

    it('should lazy load emitter', function (done) {
      co(function * () {
        var events;

        var mapper = yield Mapper.define('TestEvent2', {
          methods: {
            foo: function (a, b, c) {
              a.should.equal('Hello');
              b.should.equal('World');
              Model.isModel(c).should.be.true;
            }
          },
          events: {
            get emitter() { return events; },
            pattern: 'foo.bar.{event}.{model.id}',
            mapping: {
              foo: 'fooEvent'
            }
          }
        });
        var model = Model.get('Test')({ id: 456 });

        events = new EventEmitter();

        events.once('foo.bar.fooevent.456', function (e) {
          e.action.should.be.equal('fooEvent');
          e.model.should.eql(model.toJSON());
          
          setImmediate(done);  // finalize
        });

        // NOTE : model is not the first argument, and it should work still
        yield mapper.foo('Hello', 'World', model);

      })(function (err) {
        err && console.log("*** ERR", err.stack);
        assert.equal(err, null, 'err is null');
      });
    });

  });


});
