
var connections = require('../../lib/connections');

describe('Test Connections', function () {

  it('should register adapters', function * () {
    function * customAdapter(connectionInfo) {}

    connections.isAdapterRegistered('test').should.be.false;
    connections.registerAdapter('test', customAdapter);
    connections.isAdapterRegistered('test').should.be.true;
    connections.unregisterAdapter('test');
    connections.isAdapterRegistered('test').should.be.false;
  });

  it('should validate isAdapterRegistered', function () {
    [
      undefined, null, true, false, 0, '', /test/, {}, [], function () {}
    ].forEach(function (adapter) {
      (function () {
        connections.isAdapterRegistered(adapter);
      }).should.throw();
      (function () {
        connections.unregisterAdapter(adapter);
      }).should.throw();
    });
  });

  it('should not register adapter', function () {
    [
      undefined, null, true, false, 0, '', /test/, {}, [], function () {}
    ].forEach(function (adapter) {
      (function () {
        connections.registerAdapter(adapter, function () {});
      }).should.throw();
    });

    [
      undefined, null, true, false, 0, '', 'test', /test/, {}, []
    ].forEach(function (factory) {
      (function () {
        connections.registerAdapter('test', factory);
      }).should.throw();
    });
  });

  it('should register valid connections', function * () {
    var conStrings = [
      'adapter://user:pass@host/dbname',
      'adapter://user:pass@host/',
      'adapter://user:pass@host',
      'adapter://user@host/dbname',
      'adapter://user@host/',
      'adapter://user@host',
      'adapter://host/dbname',
      'adapter://host/',
      'adapter://host',
      'adapter://'
    ];
    var currentString;

    function * customAdapter(connectionInfo) {
      conStrings.indexOf(connectionInfo.source).should.be.greaterThan(-1);
      connectionInfo.source.should.be.equal(currentString);
      connectionInfo.adapter.should.be.equal('adapter');
      connectionInfo.user.should.not.be.empty;
      connectionInfo.should.have.ownProperty('pass').and.be.a.String;
      connectionInfo.host.should.not.be.empty;
      connectionInfo.dbname.should.not.be.empty;
    }

    connections.registerAdapter('adapter', customAdapter);

    for (var i = 0, len = conStrings.length; i < len; ++i) {
      currentString = conStrings[i];

      connections.define('testAdapter', currentString);
      connections.isDefined('testAdapter').should.be.true;

      yield connections.get('testAdapter');

      connections.undefine('testAdapter');
      connections.isDefined('testAdapter').should.be.false;
    }
  });

  it('should validate isDefined', function () {
    [
      undefined, null, true, false, 0, '', /test/, {}, [], function () {}
    ].forEach(function (name) {
      (function () {
        connections.isDefined(name);
      }).should.throw();
      (function () {
        connections.get(name).next();
      }).should.throw();
      (function () {
        connections.undefine(name);
      }).should.throw();
    });

    (function () {
      connections.get('invalid').next();
    }).should.throw();

    connections.registerAdapter('adapter', function () {});
    connections.define('test', 'adapter://');
    connections.unregisterAdapter('adapter');
    (function () {
      connections.get('test').next();
    }).should.throw();
    connections.undefine('test');

  });

  it('should not register invalid connections', function () {
    function * customAdapter(connectionInfo) {}

    connections.isAdapterRegistered('test').should.be.false;
    connections.registerAdapter('test', customAdapter);
    connections.isAdapterRegistered('test').should.be.true;

    connections.isAdapterRegistered('invalid').should.be.false;
    connections.isDefined('test').should.be.false;

    [
      undefined, null, true, false, 0, '', /test/, {}, [], function () {}
    ].forEach(function (name) {
      (function () {
        connections.define(name, 'test://');
      }).should.throw();
    });

    [
      undefined, null, true, false, 0, '', 'invalid', /test/, {}, [], function () {}
    ].forEach(function (connectionString) {
      (function () {
        connections.define('test', connectionString);
      }).should.throw();
    });

    connections.isAdapterRegistered('invalid').should.be.false;
    connections.isDefined('test').should.be.false;

    connections.unregisterAdapter('test');
    connections.isAdapterRegistered('test').should.be.false;
  });

});
