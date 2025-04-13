import assert from 'node:assert';
import {TestAdapter} from '@yeoman/adapter/testing';
import _ from 'lodash';
import sinon from 'sinon';
import Router from '../lib/router.js';
import {home} from '../lib/routes/home.js';
import {fakeEnv} from './helpers.js';

describe('home route', () => {
  /** @type {TestAdapter} */
  let adapter;

  beforeEach(async function () {
    this.sandbox = sinon.createSandbox();
    this.env = await fakeEnv();
    adapter = new TestAdapter();
    this.router = new Router({adapter, env: this.env});
    this.router.registerRoute('home', home);
    this.runRoute = sinon.stub().returns(Promise.resolve());
    this.router.registerRoute('run', this.runRoute);
    this.helpRoute = sinon.stub().returns(Promise.resolve());
    this.router.registerRoute('help', this.helpRoute);
    this.installRoute = sinon.stub().returns(Promise.resolve());
    this.router.registerRoute('install', this.installRoute);
    this.updateRoute = sinon.stub().returns(Promise.resolve());
    this.router.registerRoute('update', this.updateRoute);
  });

  afterEach(function () {
    this.sandbox.restore();
  });

  it('allow going to help', async function () {
    this.sandbox.stub(adapter, 'prompt').returns(Promise.resolve({whatNext: 'help'}));
    await this.router.navigate('home').then(() => {
      sinon.assert.calledOnce(this.helpRoute);
    });
  });

  it('allow going to install', async function () {
    this.sandbox.stub(adapter, 'prompt').returns(Promise.resolve({whatNext: 'install'}));
    await this.router.navigate('home').then(() => {
      sinon.assert.calledOnce(this.installRoute);
    });
  });

  it('does not display update options if no generators is installed', async function () {
    this.router.generator = [];
    this.sandbox.stub(adapter, 'prompt').callsFake(prompts => {
      assert.strictEqual(_.map(prompts[0].choices, 'value').includes('update'), false);
      return Promise.resolve({whatNext: 'exit'});
    });

    await this.router.navigate('home');
  });

  it('show update menu option if there is installed generators', async function () {
    this.router.generators = [{
      namespace: 'unicorn:app',
      appGenerator: true,
      prettyName: 'unicorn',
      updateAvailable: false,
    }];

    this.sandbox.stub(adapter, 'prompt').callsFake(prompts => {
      assert(_.map(prompts[0].choices, 'value').includes('update'));
      return Promise.resolve({whatNext: 'update'});
    });

    await this.router.navigate('home').then(() => {
      sinon.assert.calledOnce(this.updateRoute);
    });
  });

  it('list runnable generators', async function () {
    this.router.generators = [{
      namespace: 'unicorn:app',
      appGenerator: true,
      prettyName: 'unicorn',
      updateAvailable: false,
    }];

    this.sandbox.stub(adapter, 'prompt').callsFake(prompts => {
      assert.strictEqual(prompts[0].choices[1].value.generator, 'unicorn:app');
      return Promise.resolve({
        whatNext: {
          method: 'run',
          generator: 'unicorn:app',
        },
      });
    });

    await this.router.navigate('home').then(() => {
      sinon.assert.calledWith(this.runRoute, this.router, 'unicorn:app');
    });
  });

  it('show update available message behind generator name', async function () {
    this.router.generators = [{
      namespace: 'unicorn:app',
      appGenerator: true,
      prettyName: 'unicorn',
      updateAvailable: true,
    }];

    this.sandbox.stub(adapter, 'prompt').callsFake(prompts => {
      assert(prompts[0].choices[1].name.includes('♥ Update Available!'));
      return Promise.resolve({whatNext: 'exit'});
    });

    await this.router.navigate('home');
  });
});
