
var Mapper = require('../../lib/mapper');
var Evolution = require('../../lib/evolution');
var EvolutionException = require('../../lib/exceptions').EvolutionException;

var fs = require('co-fs');
var path = require('path');


describe('Test Evolution', function () {

  var fixturePath = path.normalize(path.join(__dirname, '..', 'fixtures', 'valid'));

  beforeEach(function * () {
    var evolutionConfig = path.join(fixturePath, '.evolution.json');

    if (yield fs.exists(evolutionConfig)) {
      yield fs.unlink(evolutionConfig);
    }

  });

  it('should apply all patches', function * () {
    var mapper = Mapper.define('EvoMapper1');

    yield Evolution.apply(mapper, {
      path: fixturePath
    });

    mapper.testEvolution.should.be.eql([1, 2, 3, 4]);

  });

  it('should apply and rollback', function * () {
    var mapper = Mapper.define('EvoMapper2');

    yield Evolution.apply(mapper, {
      path: fixturePath
    });

    mapper.testEvolution.should.be.eql([1, 2, 3, 4]);

    delete mapper.testEvolution;

    // rollback
    yield Evolution.apply(mapper, {
      version: '0.1.0',
      path: fixturePath
    });

    mapper.testEvolution.should.be.eql([-4, -3, -2]);

    delete mapper.testEvolution;

    yield Evolution.apply(mapper, {
      version: '0.1.1',
      path: fixturePath
    });

    mapper.should.not.have.property('testEvolution');

    delete mapper.testEvolution;

    yield Evolution.apply(mapper, {
      version: '0.0.0',
      path: fixturePath
    });

    mapper.testEvolution.should.be.eql([-1]);

  });

  it('should fail with invalid version', function * () {
    var mapper = Mapper.define('EvoMapper3');
    var versions = [
      undefined, false, true, null, '', '1.0', 'a.b.c', /1\.2\.3/, {}, [], function () {}
    ];

    for (var v in versions) {
      try {
        yield Evolution.apply(mapper, {
          version: versions[v],
          path: fixturePath
        });

        throw new Error('Should have thrown EvolutionException with value `' + String(versions[v]) + '`');
      } catch (e) {
        e.should.be.instanceof(EvolutionException);
      }
    }
  });

  it('should fail with invalid path', function * () {
    var mapper = Mapper.define('EvoMapper4');
    var invalidPaths = [
      undefined, null, false, true, '', 0, 1, /foo/, {}, [], function () {}, '/path/to/invalid/file'
    ];

    for (var p in invalidPaths) {
      try {
        yield Evolution.apply(mapper, {
          path: invalidPaths[p]
        });

        throw new Error('Should have thrown EvolutionException with value `' + String(invalidPaths[p]) + '`');
      } catch (e) {
        e.should.be.instanceof(EvolutionException);
      }
    }
  });

});
