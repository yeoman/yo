import sinon from 'sinon';
import {createEnv} from 'yeoman-environment';

export const fakeCrossSpawn = event => sinon.stub().returns({
  on(name, callback) {
    if (name === event) {
      callback();
    }

    return this;
  },
});

export const fakeEnv = () => {
  const env = createEnv();
  sinon.stub(env, 'lookup');
  sinon.stub(env, 'run');
  return env;
};
