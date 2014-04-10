/**
Model Mapper Exceptions
*/

var errorFactory = require('error-factory');

/**
Expose Mapper: MapperException
*/
module.exports.MapperException = errorFactory('MapperException');

/**
Expose Mapper: AbstractMapperMethodException
*/
module.exports.AbstractMapperMethodException = errorFactory('AbstractMapperMethodException');

/**
Expose Connections: ConnectionException
*/
module.exports.ConnectionException = errorFactory('ConnectionException');

/**
Expose Evolution: EvolutionException
*/
module.exports.EvolutionException = errorFactory('EvolutionException');
