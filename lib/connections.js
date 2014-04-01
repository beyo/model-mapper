/**
Mapper connections
*/

var pg = require('pg');
var suspend = require('co-suspend');
var DbConnectionException = require('./exceptions').DbConnectionException;

/**
Connection registry
*/
var connections = {};


module.exports.define = defineConnection;
module.exports.get = getConnection;
module.exports.undefine = undefineConnection;


/**
Define a new connection string by name

@param {String} name               the name of the connection string
@param {String} connectionString   the connection string to use
*/
function defineConnection(name, connectionString) {
  connections[name] = connectionString;
}

/**
Retrive the postgreSQL client associated with the named connection

@param {String} name        the name of the connection string
@return {Client}            the postgreSQL client
*/
function * getConnection(name) {
  var connectionString = connections[name];
  var marker;

  if (!connectionString) {
    throw new DbConnectionException('Unknown connection name : ' + String(name));
  }

  marker = suspend();

  pg.connect(connectionString, function(err, client, done) {
    done();
    marker.resume(err, client);
  });

  return yield marker.wait();  // return client
}

/**
Undefine the named connection and optionally end the client in the pool

@param {String} name         the name of the connection string
@param {Boolean} disconnect  make sure that the client is disconnected
*/
function * undefineConnection(name, disconnect) {
  var connectionString = connections[name];
  var marker;

  delete connections[name];

  if (disconnect && connectionString) {
    marker = suspend();

    pg.connect(connectionString, function(err, client, done) {
      client.end();
      done();

      marker.resume(err);
    });

    yield marker.wait();
  }
}
