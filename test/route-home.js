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

  it('allow going to help', async function () {
    adapter.addAnswers({whatNext: 'help'});

    await this.router.navigate('home');

    sinon.assert.calledOnce(this.helpRoute);
  });

  it('allow going to install', async function () {
    adapter.addAnswers({whatNext: 'install'});

    await this.router.navigate('home');

    sinon.assert.calledOnce(this.installRoute);
  });

  it('does not display update options if no generators is installed', async function () {
    this.router.generator = [];
    adapter.addAnswers({whatNext: 'exit'});

    await this.router.navigate('home');

    assert.strictEqual(_.map(adapter.calls[0].question.choices, 'value').includes('update'), false);
  });

  it('show update menu option if there is installed generators', async function () {
    this.router.generators = [{
      namespace: 'unicorn:app',
      appGenerator: true,
      prettyName: 'unicorn',
      updateAvailable: false,
    }];

    adapter.addAnswers({whatNext: 'update'});

    await this.router.navigate('home');

    assert(_.map(adapter.calls[0].question.choices, 'value').includes('update'));
    sinon.assert.calledOnce(this.updateRoute);
  });

  it('list runnable generators', async function () {
    this.router.generators = [{
      namespace: 'unicorn:app',
      appGenerator: true,
      prettyName: 'unicorn',
      updateAvailable: false,
    }];

    adapter.addAnswers({
      whatNext: {
        method: 'run',
        generator: 'unicorn:app',
      },
    });

    await this.router.navigate('home');

    assert.strictEqual(adapter.calls[0].question.choices[1].value.generator, 'unicorn:app');
    sinon.assert.calledWith(this.runRoute, this.router, 'unicorn:app');
  });

  it('show update available message behind generator name', async function () {
    this.router.generators = [{
      namespace: 'unicorn:app',
      appGenerator: true,
      prettyName: 'unicorn',
      updateAvailable: true,
    }];

    adapter.addAnswers({whatNext: 'exit'});

    await this.router.navigate('home');

    assert(adapter.calls[0].question.choices[1].name.includes('♥ Update Available!'));
  });
});
