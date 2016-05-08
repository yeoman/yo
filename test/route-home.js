'use strict';
var _ = require('lodash');
var assert = require('assert');
var sinon = require('sinon');
var inquirer = require('inquirer');
var Promise = require('pinkie-promise');
var Router = require('../lib/router');
var helpers = require('./helpers');

describe('home route', function () {
  beforeEach(function () {
    this.sandbox = sinon.sandbox.create();
    this.insight = helpers.fakeInsight();
    this.env = helpers.fakeEnv();
    this.router = new Router(this.env, this.insight);
    this.router.registerRoute('home', require('../lib/routes/home'));

    this.runRoute = sinon.spy();
    this.router.registerRoute('run', this.runRoute);

    this.helpRoute = sinon.spy();
    this.router.registerRoute('help', this.helpRoute);
    this.installRoute = sinon.spy();
    this.router.registerRoute('install', this.installRoute);
    this.updateRoute = sinon.spy();
    this.router.registerRoute('update', this.updateRoute);
  });

  afterEach(function () {
    this.sandbox.restore();
  });

  it('track usage', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whatNext: 'exit'}));
    return this.router.navigate('home').then(function () {
      sinon.assert.calledWith(this.insight.track, 'yoyo', 'home');
    }.bind(this));
  });

  it('allow going to help', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whatNext: 'help'}));
    return this.router.navigate('home').then(function () {
      sinon.assert.calledOnce(this.helpRoute);
    }.bind(this));
  });

  it('allow going to install', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whatNext: 'install'}));
    return this.router.navigate('home').then(function () {
      sinon.assert.calledOnce(this.installRoute);
    }.bind(this));
  });

  it('does not display update options if no generators is installed', function () {
    this.router.generator = [];
    this.sandbox.stub(inquirer, 'prompt', function (prompts) {
      assert.equal(_.pluck(prompts[0].choices, 'value').indexOf('update'), -1);
      return Promise.resolve({whatNext: 'exit'});
    });
    return this.router.navigate('home');
  });

  it('show update menu option if there is installed generators', function () {
    this.router.generators = [{
      namespace: 'unicorn:app',
      appGenerator: true,
      prettyName: 'unicorn',
      updateAvailable: false
    }];

    this.sandbox.stub(inquirer, 'prompt', function (prompts) {
      assert(_.pluck(prompts[0].choices, 'value').indexOf('update') >= 0);
      return Promise.resolve({whatNext: 'update'});
    });
    return this.router.navigate('home').then(function () {
      sinon.assert.calledOnce(this.updateRoute);
    }.bind(this));
  });

  it('list runnable generators', function () {
    this.router.generators = [{
      namespace: 'unicorn:app',
      appGenerator: true,
      prettyName: 'unicorn',
      updateAvailable: false
    }];

    this.sandbox.stub(inquirer, 'prompt', function (prompts) {
      assert.equal(prompts[0].choices[1].value.generator, 'unicorn:app');
      return Promise.resolve({
        whatNext: {
          method: 'run',
          generator: 'unicorn:app'
        }
      });
    });
    return this.router.navigate('home').then(function () {
      sinon.assert.calledWith(this.runRoute, this.router, 'unicorn:app');
    }.bind(this));
  });

  it('show update available message behind generator name', function () {
    this.router.generators = [{
      namespace: 'unicorn:app',
      appGenerator: true,
      prettyName: 'unicorn',
      updateAvailable: true
    }];

    this.sandbox.stub(inquirer, 'prompt', function (prompts) {
      assert(prompts[0].choices[1].name.indexOf('♥ Update Available!') >= 0);
      return Promise.resolve({whatNext: 'exit'});
    });
    return this.router.navigate('home');
  });
});
