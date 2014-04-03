/**
Model mapper
*/

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Model = require('beyo-model').Model;
var Types = require('beyo-model').Types;
var isNameValid = require('beyo-model/lib/name-validator');
var Connections = require('./connections');
var MapperException = require('./exceptions').MapperException;

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
  prototype = _preparePrototype(options);

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
  util.inherits(MapperConstructor, EventEmitter);

  Object.defineProperties(MapperConstructor.prototype, prototype);

  Object.freeze(MapperConstructor.prototype);

  // create and return
  return mappers[mapperName] = new MapperConstructor();
};


function getMapper(mapperName) {
  if (typeof mapperName !== 'string') {
    throw new MapperException('Mapper name must be a string `' + String(mapperName) + '`');
  } else if (!mapperName.replace(/\s/g, '').length) {
    throw new MapperException('Mapper name must not be empty');
  }

  return mappers[mapperName];
}


function _getTypeName(mapperName) {
  return mapperName.split('.').pop();
}

function _getNamespace(mapperName) {
  var ns = mapperName.split('.');
  return ns.slice(0, ns.length - 1).join('.');
}



function _preparePrototype(options) {
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
      throw new MapperException('Invalid mapper model type `' + String(options.modelType) + '`');
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

    _mixinModel(options.model);
  }

  if (options.connection) {
    if (!Connections.isDefined(options.connection)) {
      throw new MapperException('Mapper for an invalid model type `' + String(options.modelType) + '`');
    }

    proto._connection = {
      enumerable: false,
      configurable: false,
      get: options.connection
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


function _mixinModel(modelOptions) {
  var methods;
  var method;
  var i;
  var ilen;
  var ModelType;
  var modelProto = {};

  if (modelOptions.methods) {
    if (typeof modelOptions.methods !== 'object') {
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

    ModelType = Model.get(modelOptions.type);
    Object.defineProperties(ModelType.prototype, modelProto);
  }
}


/**
New model mapper
*/
function Mapper() {}
util.inherits(Mapper, EventEmitter);
