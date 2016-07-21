/**
Model mapper
*/

const EVENT_PATTERN_TOKENS = /\{([^{]+)\}/g;
const DEFAULT_EVENT_PATTERN = '{model._type.canonicalName}.{event}';
const DEFAULT_EVENT_METHOD_MAPPING = {
  create: 'create',
  update: 'update',
  delete: 'delete',
  deleteAll: 'delete'
};

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Model = require('beyo-model').Model;
var Types = require('beyo-model').Types;
var Collection = require('beyo-model').Collection;
var isNameValid = require('var-validator').isValid;
var Connections = require('./connections');
var Evolution = require('./evolution');
var MapperException = require('./exceptions').MapperException;
var AbstractMapperMethodException = require('./exceptions').AbstractMapperMethodException;

var nameValidatorOptions = {
  enableScope: true,
  enableBrackets: false,
  allowLowerCase: true,
  allowUpperCase: true
};

var events = new EventEmitter();

/**
Model types registry
*/
var mappers = {};

/**
Default model mixin methods
*/
var defaultMixinModelMethods = {
  save: saveModel,
  delete: deleteModel
};


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
Expose mapper test
*/
module.exports.isMapper = isMapper;


/**
Expose default event pattern
*/
module.exports.DEFAULT_EVENT_PATTERN = DEFAULT_EVENT_PATTERN;

/**
Expose default mapping constant
*/
module.exports.DEFAULT_EVENT_MAPPING = DEFAULT_EVENT_METHOD_MAPPING;


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
function * defineMapper(mapperName, options) {
  var MapperConstructor;
  var typeName;
  var namespace;
  var mapper;

  if (typeof mapperName !== 'string') {
    throw MapperException('Mapper name must be a string `' + String(mapperName) + '`');
  } else if (!mapperName.replace(/\s/g, '').length) {
    throw MapperException('Mapper name must not be empty');
  } else if (!isNameValid(mapperName, nameValidatorOptions)) {
    throw MapperException('Invalid type name `' + mapperName + '`');
  } else if (mappers[mapperName]) {
    throw MapperException('Mapper already defined : ' + mapperName);
  }

  options = options || {};

  namespace = _getNamespace(mapperName);
  typeName = _getTypeName(mapperName);

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

  // create and return
  mapper = new MapperConstructor();

  mappers[mapperName] = mapper;

  prototype = yield _preparePrototype(mapperName, namespace, typeName, options);

  Object.defineProperties(MapperConstructor.prototype, prototype);
  
  events.emit('define', {
    mapperName: mapperName,
    namespace: namespace,
    typeName: typeName,
    prototype: MapperConstructor.prototype,
    options: options
  });

  Object.freeze(MapperConstructor.prototype);

  if (options.evolution) {
    yield Evolution.apply(mapper, options.evolution);
  }

  return mapper;
};


function getMapper(mapperName) {
  if (typeof mapperName !== 'string') {
    throw MapperException('Mapper name must be a string `' + String(mapperName) + '`');
  } else if (!mapperName.replace(/\s/g, '').length) {
    throw MapperException('Mapper name must not be empty');
  } else if (!mappers[mapperName]) {
    throw MapperException('Unknown mapper `' + mapperName + '`');
  }

  return mappers[mapperName];
}


function isDefinedMapper(mapperName) {
  if (typeof mapperName !== 'string') {
    throw MapperException('Mapper name must be a string `' + String(mapperName) + '`');
  } else if (!mapperName.replace(/\s/g, '').length) {
    throw MapperException('Mapper name must not be empty');
  }

  return !!mappers[mapperName];
}


function isMapper(mapper) {
  return mapper instanceof Mapper;
}


function _getTypeName(mapperName) {
  return mapperName.split('.').pop();
}


function _getNamespace(mapperName) {
  var ns = mapperName.split('.');
  return ns.slice(0, ns.length - 1).join('.');
}



function * _preparePrototype(mapperName, namespace, typeName, options) {
  var proto = {
    canonicalName: {
      enumerable: true,
      configurable: false,
      writable: false,
      value: mapperName
    },
    namespace: {
      enumerable: true,
      configurable: false,
      writable: false,
      value: namespace
    },
    name: {
      enumerable: true,
      configurable: false,
      writable: false,
      value: typeName
    } 
  };
  var methods;
  var method;
  var methodFn;
  var methdoFnWrapper;
  var i;
  var ilen;
  var modelDefineListener;

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
      throw MapperException('Invalid mapper model option');
    }

    if (!Model.isDefined(options.model.type)) {
      modelDefineListener = function (e) {
        if (e.modelType === options.model.type) {
          _mixinModel(mapperName, options.model);

          Model.removeListener('define', modelDefineListener);
          modelDefineListener = undefined;
        }
      };

      // delay model mixin...
      Model.on('define', modelDefineListener);
    } else {
      _mixinModel(mapperName, options.model);
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
        if (modelDefineListener) {
          throw MapperException('Undefined mapper model `' + options.model.type + '`');
        }

        return Model.get(options.model.type);
      }
    };

    proto.Collection = {
      enumerable: true,
      configurable: false,
      writable: false,
      value: function createCollection() {
        if (modelDefineListener) {
          throw MapperException('Undefined mapper model `' + options.model.type + '`');
        }

        return Collection({ modelType: options.model.type });
      }
    };
  }

  if (options.connection) {
    if (!Connections.isDefined(options.connection)) {
      throw MapperException('Unknown connection `' + String(options.connection) + '`');
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

  methdoFnWrapper = _methodEventWrapper(mapperName, options.events);

  if (options.methods) {
    if (typeof options.methods !== 'object') {
      throw MapperException('Methods must be an object');
    }

    methods = Object.keys(options.methods);

    for (i = 0, ilen = methods.length; i < ilen; ++i) {
      method = methods[i];

      if (!(options.methods[method] instanceof Function)) {
        throw MapperException('Method `' + method + '` must be a function');
      }

      methodFn = options.methods[method];

      if (methdoFnWrapper) {
        methodFn = methdoFnWrapper(method, methodFn);
      }

      proto[method] = {
        enumerable: true,
        configurable: false,
        writable: false,
        value: methodFn
      };
    }
  }

  return proto;
}


function _methodEventWrapper(mapperName, eventsOptions) {
  var eventMethod;

  // shortcut here if no option is defined
  if (!eventsOptions) {
    return false;
  }

  // make sure that emitter is a getter...
  var desc = Object.getOwnPropertyDescriptor(eventsOptions, 'emitter');
  if (!desc || !(desc.get || 'value' in desc)) {
    eventsOptions.emitter = events;  // Mapper's global events
  }

  if (!eventsOptions.pattern) {
    eventsOptions.pattern = DEFAULT_EVENT_PATTERN;
  }

  eventsOptions.mapping = eventsOptions.mapping || DEFAULT_EVENT_METHOD_MAPPING;

  function _compileEventName(data) {
    return eventsOptions.pattern.replace(EVENT_PATTERN_TOKENS, function (_, t) {
      var parts = t.split('.');
      var d = parts.length && data || '';

      for (var i = 0, ilen = parts.length; i < ilen; ++i) {
        d = d[parts[i]] || '';
      }

      return String(d);
    });
  }

  return function (methodName, method) {
    var action = eventsOptions.mapping[methodName];

    if (action) {
      return function * eventWrapper() {
        var res = yield * (method.apply(this, arguments) || []);
        var eventName;
        var model;

        // find model in argument...
        for (var i = 0, ilen = arguments.length; i < ilen && !model; ++i) {
          if (Model.isModel(arguments[i])) {
            model = arguments[i];
          }
        }

        eventName = _compileEventName({
          mapper: mapperName,
          event: action,
          model: model
        }).toLocaleLowerCase();

        eventsOptions.emitter.emit(eventName, {
          action: action,
          model: model && model.toJSON()
        });

        return res;
      }
    } else {
      return method;
    }
  };
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

  if (Model.get(modelOptions.type).mapper) {
    throw MapperException('Model `' + String(modelOptions.type) + '` already has mapper');
  }

  if (modelOptions.methods) {
    if (modelOptions.methods.constructor.name !== 'Object') {
      throw MapperException('Model methods must be an object');
    }


    // define user-predefined methods
    methods = Object.keys(modelOptions.methods);
    for (i = 0, ilen = methods.length; i < ilen; ++i) {
      method = methods[i];

      if (!(modelOptions.methods[method] instanceof Function)) {
        throw MapperException('Method `' + method + '` must be a function');
      }

      modelProto[method] = {
        enumerable: true,
        configurable: false,
        writable: false,
        value: modelOptions.methods[method]
      };
    }
  }

  // define default methods (to not override user-predefined ones)
  methods = Object.keys(defaultMixinModelMethods);
  for (i = 0, ilen = methods.length; i < ilen; ++i) {
    method = methods[i];

    if (!modelProto[method]) {
      modelProto[method] = {
        enumerable: true,
        configurable: false,
        writable: false,
        value: defaultMixinModelMethods[method]
      };
    }
  }

  Object.defineProperties(ModelType.prototype, modelProto);
  Object.defineProperty(ModelType, 'mapper', modelMapperProperty);
  Object.defineProperty(ModelType.prototype, '_mapper', modelMapperProperty);

}


/**
Default save mixin model
*/
function * saveModel(force) {
  var ret = this;

  if (force || this._isDirty || this._isNew) {
    if (this._isNew) {
      ret = yield (this._mapper.create)(this);

      this._isNew = false;
    } else {
      ret = yield (this._mapper.update)(this);
    }
  }

  this._isDirty = false;

  return ret;
}


/**
Default delete mixin model
*/
function * deleteModel() {
  var ret = yield (this._mapper.delete)(this);

  this._isNew = true;

  return ret;
}



/**
New model mapper
*/
function Mapper() {}
util.inherits(Mapper, EventEmitter);

Object.defineProperties(Mapper.prototype, {
  create: createAbstractMethod('create'),
  find: createAbstractMethod('find'),
  findAll: createAbstractMethod('findAll'),
  update: createAbstractMethod('update'),
  delete: createAbstractMethod('delete'),
  deleteAll: createAbstractMethod('deleteAll'),
});

function createAbstractMethod(methodName) {
  return {
    enumerable: false,
    configurable: false,
    writable: false,
    value: function abstractMethod() { throw AbstractMapperMethodException('Method `' + methodName + '` not implemented'); }
  }
}
