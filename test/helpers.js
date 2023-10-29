'use strict';
const sinon = require('sinon');

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

exports.fakeEnv = async () => {
  // eslint-disable-next-line node/no-unsupported-features/es-syntax
  const {createEnv} = await import('yeoman-environment');
  const env = createEnv();
  sinon.stub(env, 'lookup');
  sinon.stub(env, 'run');
  return env;
};
