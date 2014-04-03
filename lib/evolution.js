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



function * applyEvolution(mapper, options) {
  var config;
  var files;

  options = options || {};

  if (typeof options.path !== 'string') {
    throw new EvolutionException('Evolution path is undefined');
  } else if (!options.version) {
    options.version = 'latest';
  } else if (!semver.isValid(options.version)) {
    throw new EvolutionException('Invalid evolution version `' + String(options.version) + '`');
  }

  config = yield getEvolutionConfig(options.path);
  files = yield getEvolutionFiles(options.path);

  if (options.version !== 'latest') {
    yield doRollback(options.version, config);
  }

  yield doEvolve(options.version, config, files);

  yield setEvolutionConfig(options.path, config);
}


function * getEvolutionConfig(evolutionPath) {
  var configFile = path.join(evolutionPath, EVOLUTION_CONFIG_FILE);
  var config;

  if (yield fs.exists(configFile)) {
    config = require(configFile);
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

  yield fs.writeFile(configFile, JSON.stringify(config, null, 2));
}


function * getEvolutionFiles(evolutionPath) {
  return (yield fs.readdir(evolutionPath)).filter(function (file) {
    return file.match(VALID_FILE_PATTERN) && semver.valid(file.substr(0, file.length - 3));
  });
}



function * doRollback(toVersion, config) {
  var lastFile;

  while (semver.lt(toVersion, config.currentVersion)) {

  }
}


function * doEvolve(toVersion, config, files) {


}
