import assert from 'node:assert';
import _ from 'lodash';
import sinon from 'sinon';
import inquirer from 'inquirer';
import Router from '../lib/router.js';
import {home} from '../lib/routes/home.js';
import {fakeEnv} from './helpers.js';

describe('home route', () => {
  beforeEach(async function () {
    this.sandbox = sinon.createSandbox();
    this.env = await fakeEnv();
    this.router = new Router(this.env, this.insight);
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

  it('allow going to help', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whatNext: 'help'}));
    return this.router.navigate('home').then(() => {
      sinon.assert.calledOnce(this.helpRoute);
    });
  });

  it('allow going to install', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whatNext: 'install'}));
    return this.router.navigate('home').then(() => {
      sinon.assert.calledOnce(this.installRoute);
    });
  });

  it('does not display update options if no generators is installed', function () {
    this.router.generator = [];
    this.sandbox.stub(inquirer, 'prompt').callsFake(prompts => {
      assert.strictEqual(_.map(prompts.choices, 'value').includes('update'), false);
      return Promise.resolve({whatNext: 'exit'});
    });

    return this.router.navigate('home');
  });

  it('show update menu option if there is installed generators', function () {
    this.router.generators = [{
      namespace: 'unicorn:app',
      appGenerator: true,
      prettyName: 'unicorn',
      updateAvailable: false,
    }];

    this.sandbox.stub(inquirer, 'prompt').callsFake(prompts => {
      assert(_.map(prompts.choices, 'value').includes('update'));
      return Promise.resolve({whatNext: 'update'});
    });

    return this.router.navigate('home').then(() => {
      sinon.assert.calledOnce(this.updateRoute);
    });
  });

  it('list runnable generators', function () {
    this.router.generators = [{
      namespace: 'unicorn:app',
      appGenerator: true,
      prettyName: 'unicorn',
      updateAvailable: false,
    }];

    this.sandbox.stub(inquirer, 'prompt').callsFake(prompts => {
      assert.strictEqual(prompts.choices[1].value.generator, 'unicorn:app');
      return Promise.resolve({
        whatNext: {
          method: 'run',
          generator: 'unicorn:app',
        },
      });
    });

    return this.router.navigate('home').then(() => {
      sinon.assert.calledWith(this.runRoute, this.router, 'unicorn:app');
    });
  });

  it('show update available message behind generator name', function () {
    this.router.generators = [{
      namespace: 'unicorn:app',
      appGenerator: true,
      prettyName: 'unicorn',
      updateAvailable: true,
    }];

    this.sandbox.stub(inquirer, 'prompt').callsFake(prompts => {
      assert(prompts.choices[1].name.includes('♥ Update Available!'));
      return Promise.resolve({whatNext: 'exit'});
    });

    return this.router.navigate('home');
  });
});
