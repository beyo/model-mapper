
module.exports.version = '0.2.0';
module.exports.satisfies = '>=0.1.0';

module.exports.evolve = function * (mapper) {
  mapper.testEvolution = mapper.testEvolution || [];

  mapper.testEvolution.push(2);
};

module.exports.rollback = function * (mapper) {
  mapper.testEvolution = mapper.testEvolution || [];

  mapper.testEvolution.push(-2);
};
