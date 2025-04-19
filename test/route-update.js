import {esmocha} from 'esmocha';
import {TestAdapter} from '@yeoman/adapter/testing';
import sinon from 'sinon';
import Router from '../lib/router.js';
import * as helpers from './helpers.js';

const {default: crossSpawn} = await esmocha.mock('cross-spawn');
const {update} = await import('../lib/routes/update.js');
esmocha.reset();

describe('update route', () => {
  /** @type {TestAdapter} */
  let adapter;

  beforeEach(async function () {
    this.sandbox = sinon.createSandbox();

    this.env = await helpers.fakeEnv();

    this.homeRoute = sinon.stub().returns(Promise.resolve());
    adapter = new TestAdapter();
    this.router = new Router({adapter, env: this.env});
    this.router.registerRoute('home', this.homeRoute);

    this.crossSpawn = helpers.fakeCrossSpawn('close');
    crossSpawn.mockImplementation(this.crossSpawn);

    this.router.registerRoute('update', update);
  });

  afterEach(function () {
    esmocha.clearAllMocks();
    this.sandbox.restore();
  });

  it('allows updating generators and return user to home screen', async function () {
    const generators = ['generator-cat', 'generator-unicorn'];
    this.sandbox.stub(adapter, 'prompt').returns(
      Promise.resolve({generators}),
    );

    await this.router.navigate('update');

    sinon.assert.calledWith(
      this.crossSpawn,
      'npm',
      ['install', '--global', ...generators],
    );
    sinon.assert.calledOnce(this.homeRoute);
    sinon.assert.calledOnce(this.env.lookup);
  });
});
