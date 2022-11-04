'use strict';
const sinon = require('sinon');
const yeoman = require('yeoman-environment');

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
  sinon.stub(env, 'lookup');
  sinon.stub(env, 'run');
  return env;
};
