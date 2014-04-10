/**
Model Mapper Exceptions
*/

var errorFactory = require('error-factory');

/**
Expose Mapper: MapperException
*/
module.exports.MapperException = errorFactory('beyo.model.mapper.MapperException');

/**
Expose Mapper: AbstractMapperMethodException
*/
module.exports.AbstractMapperMethodException = errorFactory('beyo.model.mapper.AbstractMapperMethodException');

/**
Expose Connections: ConnectionException
*/
module.exports.ConnectionException = errorFactory('beyo.model.mapper.ConnectionException');

/**
Expose Evolution: EvolutionException
*/
module.exports.EvolutionException = errorFactory('beyo.model.mapper.EvolutionException');
