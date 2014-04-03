
module.exports.version = '0.3.0';
module.exports.satisfies = '>=0.3.0';

module.exports.evolve = function * (mapper) {
  mapper.testEvolution = mapper.testEvolution || [];

  mapper.testEvolution.push(3);
};

module.exports.rollback = function * (mapper) {
  mapper.testEvolution = mapper.testEvolution || [];

  mapper.testEvolution.push(-3);
};
