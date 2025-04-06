'use strict';
import sinon from 'sinon';

export const fakeCrossSpawn = event => {
  return sinon.stub().returns({
    on(name, cb) {
      if (name === event) {
        cb();
      }

      return this;
    }
  });
};

export const fakeEnv = async () => {
  // eslint-disable-next-line node/no-unsupported-features/es-syntax
  const {createEnv} = await import('yeoman-environment');
  const env = createEnv();
  sinon.stub(env, 'lookup');
  sinon.stub(env, 'run');
  return env;
};
