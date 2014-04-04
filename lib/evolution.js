/**
Evolution module
*/

const EVOLUTION_CONFIG_FILE = '.evolution.json';
const VALID_FILE_PATTERN = /^[^.].*.js$/;

var path = require('path');
var fs = require('co-fs');
var semver = require('semver');

var EvolutionException = require('./exceptions').EvolutionException;


module.exports.apply = applyEvolution;


/**
Apply evolution for the given mapper using the specified options

Returns true if all evolution went well. False otherwise.

@param {Mapper} mapper     the mapper instance
@param {Object} optons     the evolution options
@return {Boolean}          true if everything went well.
*/
function * applyEvolution(mapper, options) {
  var config;
  var files;

  options = options || {};

  if (typeof options.path !== 'string') {
    throw new EvolutionException('Evolution path is undefined');
  } else if (!(yield fs.exists(options.path))) {
    throw new EvolutionException('Evolution path does not exist `' + String(options.path) + '`');
  } else if (!('version' in options)) {
    options.version = 'latest';
  } else if (!semver.valid(options.version)) {
    throw new EvolutionException('Invalid evolution version `' + String(options.version) + '`');
  }

  config = yield getEvolutionConfig(options.path);
  files = yield getEvolutionFiles(options.path);

  yield doRollback(mapper, options, config);
  yield doEvolve(mapper, options, config, files);

  yield setEvolutionConfig(options.path, config);

  return !config.activeEvolutions.some(function (info) { return info.error; });
}


function * getEvolutionConfig(evolutionPath) {
  var configFile = path.join(evolutionPath, EVOLUTION_CONFIG_FILE);
  var config;

  if (yield fs.exists(configFile)) {
    config = require(configFile);

    config.activeEvolutions = config.activeEvolutions.map(function (evolutionData) {
      evolutionData.file = path.join(evolutionPath, evolutionData.file);
      return evolutionData;
    });
  } else {
    config = {
      currentVersion: '0.0.0',
      activeEvolutions: []
    };
  }

  return config;
}

function * setEvolutionConfig(evolutionPath, config) {
  var configFile = path.join(evolutionPath, EVOLUTION_CONFIG_FILE);

  config.activeEvolutions = config.activeEvolutions.map(function (evolutionData) {
    evolutionData.file = path.relative(evolutionPath, evolutionData.file);
    return evolutionData;
  });

  yield fs.writeFile(configFile, JSON.stringify(config, null, 2));
}


function * getEvolutionFiles(evolutionPath) {
  return (yield fs.readdir(evolutionPath)).filter(function (file) {
    return file.match(VALID_FILE_PATTERN) && semver.valid(getFileVersion(file));
  }).map(function (file) {
    return path.join(evolutionPath, file);
  });
}



function * doRollback(mapper, options, config) {
  var evolution;
  var file;
  var i;

  if (options.version === 'latest' || !config.activeEvolutions.length) {
    return;
  }

  for (i = config.activeEvolutions.length - 1; i >= 0; --i) {
    file = config.activeEvolutions[i].file;

    evolution = require(file);

    if (semver.lt(options.version, getFileVersion(file)) ||
        (evolution.satisfies && !semver.satisfies(options.version, evolution.satisfies))
       ) {

      try {
        yield evolution.rollback(mapper);

        config.activeEvolutions.splice(i, 1);
      } catch (e) {
        config.activeEvolutions[i] = {
          file: file,
          method: 'rollback',
          error: e,
          previousTimestamp: config.activeEvolutions[i].timestamp,
          timestamp: Date.now()
        };
      }

    }
  }

  config.currentVersion = options.version;
}


function * doEvolve(mapper, options, config, files) {
  var evolution;
  var file;
  var i;
  var ilen;

  files = files.filter(function (file ) {
    for (var i = 0, ilen = config.activeEvolutions.length; i < ilen; ++i) {
      if (config.activeEvolutions[i].file === file) {
        return false;
      }
    }
    return true;
  });

  files.sort(function (a, b) {
    return ~~semver.gt(getFileVersion(a), getFileVersion(b));
  });

  for (var i = 0, ilen = files.length; i < ilen; ++i) {
    file = files[i];
    evolution = require(file);

    if ((options.version === 'latest') ||
        (semver.gt(options.version, getFileVersion(file)) &&
        (evolution.satisfies && !semver.satisfies(options.version, evolution.satisfies)))
       ) {

      try {
        yield evolution.evolve(mapper);

        config.activeEvolutions.push({
          file: file,
          timestamp: Date.now()
        });
      } catch (e) {
        config.activeEvolutions.push({
          file: file,
          method: 'evolve',
          error: e,
          timestamp: Date.now()
        });
      }
    }
  }

  config.currentVersion = options.version;
}


function getFileVersion(file) {
  return path.basename(file, '.js');
}
