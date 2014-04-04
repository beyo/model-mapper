
var Mapper = require('../../lib/mapper');
var Evolution = require('../../lib/evolution');
var EvolutionException = require('../../lib/exceptions').EvolutionException;

var fs = require('co-fs');
var path = require('path');
var suspend = require('co-suspend');


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
    var marker = suspend();

    Evolution.apply(mapper, {
      path: fixturePath
    });
    mapper.once('evolutionComplete', marker.resume);
    yield marker.wait();

    mapper.testEvolution.should.be.eql([1, 2, 3, 4]);

  });

  it('should apply and rollback', function * () {
    var mapper = Mapper.define('EvoMapper2');
    var marker = suspend();

    Evolution.apply(mapper, {
      path: fixturePath
    });
    mapper.once('evolutionComplete', marker.resume);
    yield marker.wait(500);

    mapper.testEvolution.should.be.eql([1, 2, 3, 4]);

    delete mapper.testEvolution;

    // rollback
    Evolution.apply(mapper, {
      version: '0.1.0',
      path: fixturePath
    });
    mapper.once('evolutionComplete', marker.resume);
    yield marker.wait(500);

    mapper.testEvolution.should.be.eql([-4, -3, -2]);

    delete mapper.testEvolution;

    Evolution.apply(mapper, {
      version: '0.1.1',
      path: fixturePath
    });
    mapper.once('evolutionComplete', marker.resume);
    yield marker.wait(500);

    mapper.should.not.have.property('testEvolution');

    delete mapper.testEvolution;

    Evolution.apply(mapper, {
      version: '0.0.0',
      path: fixturePath
    });
    mapper.once('evolutionComplete', marker.resume);
    yield marker.wait(500);

    mapper.testEvolution.should.be.eql([-1]);

  });

  it('should fail with invalid version', function * () {
    var mapper = Mapper.define('EvoMapper3');
    var marker = suspend();
    var versions = [
      undefined, false, true, null, '', '1.0', 'a.b.c', /1\.2\.3/, {}, [], function () {}
    ];

    for (var v in versions) {
      try {
        Evolution.apply(mapper, {
          version: versions[v],
          path: fixturePath
        });
        mapper.once('evolutionComplete', marker.resume);
        yield marker.wait(500);

        throw new Error('Should have thrown EvolutionException with value `' + String(versions[v]) + '`');
      } catch (e) {
        e.should.be.instanceof(EvolutionException);
      }
    }
  });

  it('should fail with invalid path', function * () {
    var mapper = Mapper.define('EvoMapper4');
    var marker = suspend();
    var invalidPaths = [
      undefined, null, false, true, '', 0, 1, /foo/, {}, [], function () {}, '/path/to/invalid/file'
    ];

    for (var p in invalidPaths) {
      try {
        Evolution.apply(mapper, {
          path: invalidPaths[p]
        });
        mapper.once('evolutionComplete', marker.resume);
        yield marker.wait(500);

        throw new Error('Should have thrown EvolutionException with value `' + String(invalidPaths[p]) + '`');
      } catch (e) {
        e.should.be.instanceof(EvolutionException);
      }
    }
  });

});
