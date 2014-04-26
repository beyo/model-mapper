/**
Model mapper
*/

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Model = require('beyo-model').Model;
var Types = require('beyo-model').Types;
var isNameValid = require('beyo-model/lib/name-validator');
var Connections = require('./connections');
var Evolution = require('./evolution');
var MapperException = require('./exceptions').MapperException;
var AbstractMapperMethodException = require('./exceptions').AbstractMapperMethodException;

var events = new EventEmitter();

/**
Model types registry
*/
var mappers = {};


/**
Define a new model prototype
*/
module.exports.define = defineMapper;

/**
Expose models
*/
module.exports.get = getMapper;

/**
Expose is defined
*/
module.exports.isDefined = isDefinedMapper;


/**
Expose event methods
*/
[
  'on', 'once',
  'addListener', 'removeListener', 'removeAllListeners',
  'listeners'
].forEach(function(method) {
  Object.defineProperty(module.exports, method, {
    enumerable: true,
    configurable: false,
    writable: false,
    value: function () {
      return events[method].apply(events, arguments);
    }
  });
});

Object.freeze(module.exports);



/**
Define a new model mapper prototype.

This will define and register a new mapper

@param {String} mapperName        the model mapper name
@param {Object} options           the model options
@return {Function}                the model constructor
*/
function defineMapper(mapperName, options) {
  var MapperConstructor;
  var typeName;
  var namespace;
  var mapper;

  if (typeof mapperName !== 'string') {
    throw new MapperException('Mapper name must be a string `' + String(mapperName) + '`');
  } else if (!mapperName.replace(/\s/g, '').length) {
    throw new MapperException('Mapper name must not be empty');
  } else if (!isNameValid(mapperName)) {
    throw new MapperException('Invalid type name `' + mapperName + '`');
  } else if (mappers[mapperName]) {
    throw new MapperException('Mapper already defined : ' + mapperName);
  }

  options = options || {};

  namespace = _getNamespace(mapperName);
  typeName = _getTypeName(mapperName);
  prototype = _preparePrototype(mapperName, options);

  events.emit('define', {
    mapperName: mapperName,
    namespace: namespace,
    typeName: typeName,
    prototype: prototype,
    options: options
  });

  MapperConstructor = Function('Mapper, events',
    'return function ' + typeName + 'Mapper() { ' +
      'if (!(this instanceof ' + typeName + 'Mapper)){' +
        'return new ' + typeName + 'Mapper();' +
      '}' +
      'Mapper.call(this);' +
      'events.emit("create", { ' +
        'type: "' + typeName + '", ' +
        'instance: this' +
      ' });' +
    ' }'
  )(Mapper, events);
  util.inherits(MapperConstructor, Mapper);

  Object.defineProperties(MapperConstructor.prototype, prototype);

  Object.freeze(MapperConstructor.prototype);

  // create and return
  mapper = new MapperConstructor();

  if (options.evolution) {
    Evolution.apply(mapper, options.evolution);
  }

  return mappers[mapperName] = mapper;
};


function getMapper(mapperName) {
  if (typeof mapperName !== 'string') {
    throw new MapperException('Mapper name must be a string `' + String(mapperName) + '`');
  } else if (!mapperName.replace(/\s/g, '').length) {
    throw new MapperException('Mapper name must not be empty');
  } else if (!mappers[mapperName]) {
    throw new MapperException('Unknown mapper `' + mapperName + '`');
  }

  return mappers[mapperName];
}


function isDefinedMapper(mapperName) {
  if (typeof mapperName !== 'string') {
    throw new MapperException('Mapper name must be a string `' + String(mapperName) + '`');
  } else if (!mapperName.replace(/\s/g, '').length) {
    throw new MapperException('Mapper name must not be empty');
  }

  return !!mappers[mapperName];
}


function _getTypeName(mapperName) {
  return mapperName.split('.').pop();
}


function _getNamespace(mapperName) {
  var ns = mapperName.split('.');
  return ns.slice(0, ns.length - 1).join('.');
}



function _preparePrototype(mapperName, options) {
  var proto = {};
  var methods;
  var method;
  var i;
  var ilen;

  options = options || {};

  if (options.options) {
    proto.options = {
      enumerable: true,
      configurable: false,
      writable: false,
      value: options.options
    };

    // NOTE : we do not freeze options as it is a state object for the mapper instance
  }

  if (options.model) {
    if (typeof options.model !== 'object') {
      throw new MapperException('Invalid mapper model option');
    } else if (!Model.isDefined(options.model.type)) {
      throw new MapperException('Invalid mapper model type `' + String(options.model.type) + '`');
    } else if (Model.get(options.model.type).mapper) {
      throw new MapperException('Model `' + String(options.model.type) + '` already has mapper');
    }

    proto._modelType = {
      enumerable: false,
      configurable: false,
      writable: false,
      value: options.model.type
    };

    proto.Model = {
      enumerable: true,
      configurable: false,
      get: function getModel() {
        return Model.get(options.model.type);
      }
    }

    _mixinModel(mapperName, options.model);
  }

  if (options.connection) {
    if (!Connections.isDefined(options.connection)) {
      throw new MapperException('Unknown connection `' + String(options.connection) + '`');
    }

    proto._connectionName = {
      enumerable: false,
      configurable: false,
      writable: false,
      value: options.connection
    };

    proto.getAdapter = {
      enumerable: true,
      configurable: false,
      writable: false,
      value: function * () {
        return yield Connections.get(options.connection);
      }
    };
  }

  if (options.methods) {
    if (typeof options.methods !== 'object') {
      throw new MapperException('Methods must be an object');
    }

    methods = Object.keys(options.methods);

    for (i = 0, ilen = methods.length; i < ilen; ++i) {
      method = methods[i];

      if (!(options.methods[method] instanceof Function)) {
        throw new MapperException('Method `' + method + '` must be a function');
      }

      proto[method] = {
        enumerable: true,
        configurable: false,
        writable: false,
        value: options.methods[method]
      };
    }
  }

  return proto;
}


function _mixinModel(mapperName, modelOptions) {
  var methods;
  var method;
  var i;
  var ilen;
  var ModelType = Model.get(modelOptions.type);
  var modelProto = {};
  var modelMapperProperty = {
    enumerable: true,
    configurable: false,
    get: function getModelMapper() {
      return getMapper(mapperName);
    }
  };

  if (modelOptions.methods) {
    if (modelOptions.methods.constructor.name !== 'Object') {
      throw new MapperException('Model methods must be an object');
    }

    //ModelType = ;

    methods = Object.keys(modelOptions.methods);

    for (i = 0, ilen = methods.length; i < ilen; ++i) {
      method = methods[i];

      if (!(modelOptions.methods[method] instanceof Function)) {
        throw new MapperException('Method `' + method + '` must be a function');
      }

      modelProto[method] = {
        enumerable: true,
        configurable: false,
        writable: false,
        value: modelOptions.methods[method]
      };
    }

    Object.defineProperties(ModelType.prototype, modelProto);
  }

  Object.defineProperty(ModelType, 'mapper', modelMapperProperty);
  Object.defineProperty(ModelType.prototype, '_mapper', modelMapperProperty);

}


/**
New model mapper
*/
function Mapper() {}
util.inherits(Mapper, EventEmitter);

Mapper.prototype.create = function createAbstract() { throw AbstractMapperMethodException('Method `create` not implemented'); };
Mapper.prototype.find = function findAbstract() { throw AbstractMapperMethodException('Method `find` not implemented'); };
Mapper.prototype.findAll = function findAllAbstract() { throw AbstractMapperMethodException('Method `findAll` not implemented'); };
Mapper.prototype.update = function updateAbstract() { throw AbstractMapperMethodException('Method `update` not implemented'); };
Mapper.prototype.delete = function deleteAbstract() { throw AbstractMapperMethodException('Method `delete` not implemented'); };
Mapper.prototype.deleteAll = function deleteAllAbstract() { throw AbstractMapperMethodException('Method `deleteAll` not implemented'); };
