
module.exports.version = '0.1.0';
module.exports.satisfies = '>=0.0.0';

module.exports.evolve = function * (mapper) {
  mapper.testEvolution = mapper.testEvolution || [];

  mapper.testEvolution.push(1);
};

module.exports.rollback = function * (mapper) {
  mapper.testEvolution = mapper.testEvolution || [];

  mapper.testEvolution.push(-1);
};
