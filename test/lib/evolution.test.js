
var Mapper = require('../../lib/mapper');
var Evolution = require('../../lib/evolution');

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

});
