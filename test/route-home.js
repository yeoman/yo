'use strict';
var _ = require('lodash');
var assert = require('assert');
var sinon = require('sinon');
var inquirer = require('inquirer');
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

  it('track usage', function (done) {
    this.sandbox.stub(inquirer, 'prompt', function (prompts, cb) {
      sinon.assert.calledWith(this.insight.track, 'yoyo', 'home');
      cb({whatNext: 'exit'});
      done();
    }.bind(this));
    this.router.navigate('home');
  });

  it('allow going to help', function (done) {
    this.sandbox.stub(inquirer, 'prompt', function (prompts, cb) {
      cb({whatNext: 'help'});
      sinon.assert.calledOnce(this.helpRoute);
      done();
    }.bind(this));
    this.router.navigate('home');
  });

  it('allow going to install', function (done) {
    this.sandbox.stub(inquirer, 'prompt', function (prompts, cb) {
      cb({whatNext: 'install'});
      sinon.assert.calledOnce(this.installRoute);
      done();
    }.bind(this));
    this.router.navigate('home');
  });

  it('does not display update options if no generators is installed', function (done) {
    this.router.generator = [];
    this.sandbox.stub(inquirer, 'prompt', function (prompts, cb) {
      assert.equal(_.pluck(prompts[0].choices, 'value').indexOf('update'), -1);
      done();
    }.bind(this));
    this.router.navigate('home');
  });

  it('show update menu option if there is installed generators', function (done) {
    this.router.generators = [{
      namespace: 'unicorn:app',
      appGenerator: true,
      prettyName: 'unicorn',
      updateAvailable: false
    }];

    this.sandbox.stub(inquirer, 'prompt', function (prompts, cb) {
      assert(_.pluck(prompts[0].choices, 'value').indexOf('update') >= 0);
      cb({whatNext: 'update'});
      sinon.assert.calledOnce(this.updateRoute);
      done();
    }.bind(this));
    this.router.navigate('home');
  });

  it('list runnable generators', function (done) {
    this.router.generators = [{
      namespace: 'unicorn:app',
      appGenerator: true,
      prettyName: 'unicorn',
      updateAvailable: false
    }];

    this.sandbox.stub(inquirer, 'prompt', function (prompts, cb) {
      assert.equal(prompts[0].choices[1].value.generator, 'unicorn:app');
      cb({
        whatNext: {
          method: 'run',
          generator: 'unicorn:app'
        }
      });
      sinon.assert.calledWith(this.runRoute, this.router, 'unicorn:app');
      done();
    }.bind(this));
    this.router.navigate('home');
  });

  it('show update available message behind generator name', function (done) {
    this.router.generators = [{
      namespace: 'unicorn:app',
      appGenerator: true,
      prettyName: 'unicorn',
      updateAvailable: true
    }];

    this.sandbox.stub(inquirer, 'prompt', function (prompts, cb) {
      assert(prompts[0].choices[1].name.indexOf('♥ Update Available!') >= 0);
      done();
    }.bind(this));
    this.router.navigate('home');
  });
});
