/**
Mapper connections
*/

const CONNECTION_PATTERN = /^(.*?):\/\/(?:(.*?)(?::(.*?))?@)?(.*?)(?:\/(.*)?)?$/;

const DEFAULT_USER = 'root';
const DEFAULT_PASS = '';
const DEFAULT_HOST = 'localhost';
const DEFAULT_DBNAME = 'default';

var ConnectionException = require('./exceptions').ConnectionException;

/**
Client adapter factories
*/
var adapterFactories = {};

/**
Connection registry
*/
var connections = {};


module.exports.registerAdapter = registerAdapter;
module.exports.isAdapterRegistered = isAdapterRegistered;
module.exports.unregisterAdapter = unregisterAdapter;

module.exports.define = defineConnection;
module.exports.isDefined = isConnectionDefined;
module.exports.get = getConnection;
module.exports.undefine = undefineConnection;


/**
Register an adapter factory. The factory must be yieldable.

@param {String} name        the adapter name
@param {Function} factory   a function returning a new client
*/
function registerAdapter(name, factory) {
  if (!name) {
    throw ConnectionException('Adapter name must not be empty');
  } else if (typeof name !== 'string') {
    throw ConnectionException('Adapter name must be a string');
  } else if (!(factory instanceof Function)) {
    throw ConnectionException('Adapter factory must be a function');
  }

  adapterFactories[name] = factory;
}

/**
Is the adapter registered or not

@param {String} name        the adapter name
@return {Boolean}
*/
function isAdapterRegistered(name) {
  if (!name) {
    throw ConnectionException('Adapter name must not be empty');
  } else if (typeof name !== 'string') {
    throw ConnectionException('Adapter name must be a string');
  }

  return !!adapterFactories[name];
}

/**
Unregister an adapter factory

@param {String} name        the adapter name
*/
function unregisterAdapter(name) {
  if (!name) {
    throw ConnectionException('Adapter name must not be empty');
  } else if (typeof name !== 'string') {
    throw ConnectionException('Adapter name must be a string');
  }

  delete adapterFactories[name];
}


/**
Define a new connection string by name

@param {String} name               the name of the connection string
@param {String} connectionString   the connection string to use
*/
function defineConnection(name, connectionString) {
  var conInfo;

  if (!name) {
    throw ConnectionException('Connection name must not be empty');
  } else if (typeof name !== 'string') {
    throw ConnectionException('Connection name must be a string');
  } else if (!connectionString) {
    throw ConnectionException('Connection string must not be empty');
  } else if (typeof connectionString !== 'string') {
    throw ConnectionException('Connection string must be a string');
  }

  conInfo = connectionString.match(CONNECTION_PATTERN);

  connections[name] = {
    source: conInfo[0],
    adapter: conInfo[1],
    user: conInfo[2] || DEFAULT_USER,
    pass: conInfo[3] || DEFAULT_PASS,
    host: conInfo[4] || DEFAULT_HOST,
    dbname: conInfo[5] || DEFAULT_DBNAME
  }
}


/**
Is the given connection registered

@param {String} name        the name of the connection string
@return {Boolean}
*/
function isConnectionDefined(name) {
  if (!name) {
    throw ConnectionException('Connection name must not be empty');
  } else if (typeof name !== 'string') {
    throw ConnectionException('Connection name must be a string');
  }

  return !!connections[name];
}

/**
Retrive the postgreSQL client associated with the named connection

@param {String} name        the name of the connection string
@return {Object}            the connection adapter
*/
function * getConnection(name) {
  var connection;
  var factory;

  if (!name) {
    throw ConnectionException('Connection name must not be empty');
  } else if (typeof name !== 'string') {
    throw ConnectionException('Connection name must be a string');
  }

  connection = connections[name];

  if (!connection) {
    throw ConnectionException('Unknown connection name : ' + String(name));
  }

  factory = adapterFactories[connection.adapter];

  if (!factory) {
    throw ConnectionException('Unknown adapter : ' + String(connection.adapter));
  }

  return yield factory(connection);
}

/**
Undefine the named connection and optionally end the client in the pool

@param {String} name         the name of the connection string
*/
function undefineConnection(name) {
  if (!name) {
    throw ConnectionException('Connection name must not be empty');
  } else if (typeof name !== 'string') {
    throw ConnectionException('Connection name must be a string');
  }

  delete connections[name];
}
