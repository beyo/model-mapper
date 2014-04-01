/**
Model Mapper Exceptions
*/

var errorFactory = require('error-factory');

/**
Expose Mapper: MapperException
*/
module.exports.MapperException = errorFactory('MapperException');

/**
Expose Connections: DbConnectionException
*/
module.exports.DbConnectionException = errorFactory('DbConnectionException');
