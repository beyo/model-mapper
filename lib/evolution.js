/**
Evolution module
*/

const EVOLUTION_CONFIG_FILE = 'evolutions.json';

const VALID_FILE_PATTERN = /^[^.].*.js$/;

var path = require('path');
var co = require('co');
var fs = require('co-fs');
var semver = require('semver');

var EvolutionException = require('./exceptions').EvolutionException;


module.exports.apply = applyEvolution;


/**
Apply evolution for the given mapper using the specified options

Evolutions are applied asynchronously. Listen to the mapper event's
`evolutionComplete` to wait for this process to complete.

@param {Mapper} mapper     the mapper instance
@param {Object} optons     the evolution options
*/
function * applyEvolution(mapper, options) {
  var evolutionInfo;
  var files;
  var evolutionBasePath = options.basePath || process.cwd();
  var warningCount = 0;

  options = options || {};

  if (typeof options.path !== 'string') {
    throw EvolutionException('Evolution path is undefined');
  } else if (!('version' in options)) {
    options.version = 'latest';
  } else if (!semver.valid(options.version)) {
    throw EvolutionException('Invalid evolution version `' + String(options.version) + '`');
  }

  if (!(yield fs.exists(options.path))) {
    throw EvolutionException('Evolution path does not exist `' + String(options.path) + '`');
  }

  evolutionInfo = yield getEvolutionInfo(evolutionBasePath, options.path);
  files = yield getEvolutionFiles(options.path);

  yield doRollback(mapper, options, evolutionInfo);
  yield doEvolve(mapper, options, evolutionInfo, files);

  yield setEvolutionInfo(evolutionBasePath, options.path, evolutionInfo);

  if (evolutionInfo) {
    warningCount = evolutionInfo.activeEvolutions.reduce(function (prev, info) {
      return prev += ~~info.error;
    }, 0);
  }

  mapper.emit('evolutionComplete', warningCount);
}


/**
Load all evolutions
*/
function * loadEvolutionsData(basePath) {
  var evolutionsFile = path.join(basePath, EVOLUTION_CONFIG_FILE);
  var evolutions;

  if (yield fs.exists(evolutionsFile)) {
    evolutions = JSON.parse(yield fs.readFile(evolutionsFile, 'utf8'));
  } else {
    evolutions = {};
  }

  return evolutions;
}

/**
Save all eveolutions
*/
function * saveEvolutionData(basePath, evolutions) {
  var evolutionsFile = path.join(basePath, EVOLUTION_CONFIG_FILE);

  return yield fs.writeFile(evolutionsFile, JSON.stringify(evolutions, null, 2));
}


function * getEvolutionInfo(basePath, evolutionPath) {
  var evolutions = yield loadEvolutionsData(basePath);
  var evolutionKey = path.relative(basePath, evolutionPath);
  var evolutionInfo = evolutions[evolutionKey] || {
    currentVersion: '0.0.0',
    activeEvolutions: []
  };

  evolutionInfo.activeEvolutions = evolutionInfo.activeEvolutions.map(function (evolutionData) {
    evolutionData.file = path.join(evolutionPath, evolutionData.file);
    return evolutionData;
  });

  return evolutionInfo;
}

function * setEvolutionInfo(basePath, evolutionPath, evolutionInfo) {
  var evolutions = yield loadEvolutionsData(basePath);
  var evolutionKey = path.relative(basePath, evolutionPath);

  evolutionInfo.activeEvolutions = evolutionInfo.activeEvolutions.map(function (evolutionData) {
    evolutionData.file = path.relative(evolutionPath, evolutionData.file);
    return evolutionData;
  });

  evolutions[evolutionKey] = evolutionInfo;

  return yield saveEvolutionData(basePath, evolutions);
}


function * getEvolutionFiles(evolutionPath) {
  return (yield fs.readdir(evolutionPath)).filter(function (file) {
    return file.match(VALID_FILE_PATTERN) && semver.valid(getFileVersion(file));
  }).map(function (file) {
    return path.join(evolutionPath, file);
  });
}



function * doRollback(mapper, options, evolutionInfo) {
  var evolution;
  var file;
  var i;

  if (options.version === 'latest' || !evolutionInfo.activeEvolutions.length) {
    return;
  }

  for (i = evolutionInfo.activeEvolutions.length - 1; i >= 0; --i) {
    file = evolutionInfo.activeEvolutions[i].file;

    evolution = require(file);

    if (semver.lt(options.version, getFileVersion(file)) ||
        (evolution.satisfies && !semver.satisfies(options.version, evolution.satisfies))
       ) {

      try {
        yield evolution.rollback(mapper);

        evolutionInfo.activeEvolutions.splice(i, 1);
      } catch (e) {
        evolutionInfo.activeEvolutions[i] = {
          file: file,
          method: 'rollback',
          error: e,
          previousTimestamp: evolutionInfo.activeEvolutions[i].timestamp,
          timestamp: Date.now()
        };
      }

    }
  }

  evolutionInfo.currentVersion = options.version;
}


function * doEvolve(mapper, options, evolutionInfo, files) {
  var evolution;
  var file;
  var fileVersion;
  var i;
  var ilen;
  var latestVersion = options.version;

  files = files.filter(function (file ) {
    for (var i = 0, ilen = evolutionInfo.activeEvolutions.length; i < ilen; ++i) {
      if (evolutionInfo.activeEvolutions[i].file === file) {
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
    fileVersion = getFileVersion(file);
    evolution = require(file);

    if ((options.version === 'latest') ||
        (semver.gte(options.version, fileVersion) &&
         (!evolution.satisfies || semver.satisfies(options.version, evolution.satisfies)))
       ) {

      if (latestVersion === 'latest' || semver.lt(latestVersion, fileVersion)) {
        latestVersion = fileVersion;
      }

      try {
        yield evolution.evolve(mapper);

        evolutionInfo.activeEvolutions.push({
          file: file,
          timestamp: Date.now()
        });
      } catch (e) {
        e.stack = e.stack.split('\n');

        evolutionInfo.activeEvolutions.push({
          file: file,
          method: 'evolve',
          error: e,
          timestamp: Date.now()
        });
      }
    }
  }

  evolutionInfo.currentVersion = latestVersion;
}


function getFileVersion(file) {
  return path.basename(file, '.js');
}
