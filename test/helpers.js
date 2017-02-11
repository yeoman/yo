'use strict';
const sinon = require('sinon');
const yeoman = require('yeoman-environment');

exports.fakeInsight = () => ({
  track: sinon.stub()
});

exports.fakeCrossSpawn = event => {
  return sinon.stub().returns({
    on(name, cb) {
      if (name === event) {
        cb();
      }

      return this;
    }
  });
};

exports.fakeEnv = () => {
  const env = yeoman.createEnv();
  env.lookup = sinon.spy(cb => {
    cb();
  });
  env.run = sinon.stub();
  return env;
};
