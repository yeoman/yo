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
  sinon.stub(env, 'lookup').yields();
  sinon.stub(env, 'run');
  return env;
};
