
module.exports.version = '0.4.0';
module.exports.satisfies = '>=0.4.0';

module.exports.evolve = function * (mapper) {
  mapper.testEvolution = mapper.testEvolution || [];

  mapper.testEvolution.push(4);
};

module.exports.rollback = function * (mapper) {
  mapper.testEvolution = mapper.testEvolution || [];

  mapper.testEvolution.push(-4);
};
