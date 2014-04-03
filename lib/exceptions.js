/**
Model Mapper Exceptions
*/

var errorFactory = require('error-factory');

/**
Expose Mapper: MapperException
*/
module.exports.MapperException = errorFactory('MapperException');

/**
Expose Connections: ConnectionException
*/
module.exports.ConnectionException = errorFactory('ConnectionException');

/**
Expose Evolution: EvolutionException
*/
module.exports.EvolutionException = errorFactory('EvolutionException');
