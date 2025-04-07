import sinon from 'sinon';

export const fakeCrossSpawn = event => sinon.stub().returns({
  on(name, callback) {
    if (name === event) {
      callback();
    }

    return this;
  },
});

export const fakeEnv = async () => {
  const {createEnv} = await import('yeoman-environment');
  const env = createEnv();
  sinon.stub(env, 'lookup');
  sinon.stub(env, 'run');
  return env;
};
