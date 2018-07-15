'use strict';
const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const _ = require('lodash');
const inquirer = require('inquirer');
const Router = require('../lib/router');
const helpers = require('./helpers');

describe('clear config route', () => {
  beforeEach(function () {
    this.sandbox = sinon.createSandbox();
    this.insight = helpers.fakeInsight();
    this.globalConfig = {
      remove: sinon.stub(),
      removeAll: sinon.stub(),
      getAll() {
        return {
          'generator-phoenix': {},
          'generator-unicorn': {}
        };
      }
    };
    const conf = {
      get() {
        return {
          unicorn: 20,
          phoenix: 10
        };
      }
    };
    this.homeRoute = sinon.spy();
    this.router = new Router(sinon.stub(), this.insight, conf);
    this.router.registerRoute('home', this.homeRoute);
    const clearConfig = proxyquire('../lib/routes/clear-config', {
      '../utils/global-config': this.globalConfig
    });

    this.router.registerRoute('clearConfig', clearConfig);
    this.router.generators = {
      'generator-unicorn': {
        name: 'generator-unicorn',
        prettyName: 'Unicorn',
        namespace: 'unicorn:app'
      },
      'generator-foo': {
        name: 'generator-foo',
        prettyName: 'Foo',
        namespace: 'foo:app'
      }
    };
  });

  afterEach(function () {
    this.sandbox.restore();
  });

  it('allow returning home', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whatNext: 'home'}));
    return this.router.navigate('clearConfig').then(() => {
      sinon.assert.calledOnce(this.homeRoute);
    });
  });

  it('track page and answer', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(
      Promise.resolve({whatNext: 'generator-angular:0.0.0'})
    );
    return this.router.navigate('clearConfig').then(() => {
      sinon.assert.calledWith(this.insight.track, 'yoyo', 'clearGlobalConfig');
      sinon.assert.calledWith(
        this.insight.track,
        'yoyo',
        'clearGlobalConfig',
        {whatNext: 'generator-angular:0.0.0'}
      );
    });
  });

  it('allows clearing a generator and return user to home screen', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whatNext: 'foo'}));
    this.router.navigate('clearConfig').then(() => {
      sinon.assert.calledOnce(this.globalConfig.remove);
      sinon.assert.calledWith(this.globalConfig.remove, 'foo');
      sinon.assert.calledOnce(this.homeRoute);
    });
  });

  it('allows clearing all generators and return user to home screen', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whatNext: '*'}));
    return this.router.navigate('clearConfig').then(() => {
      sinon.assert.calledOnce(this.globalConfig.removeAll);
      sinon.assert.calledOnce(this.homeRoute);
    });
  });

  it('shows generator with global config entry', function () {
    let choices = [];

    this.sandbox.stub(inquirer, 'prompt').callsFake(arg => {
      ({choices} = arg[0]);
      return Promise.resolve({whatNext: 'foo'});
    });
    return this.router.navigate('clearConfig').then(() => {
      // Clear all generators entry is present
      assert.ok(_.find(choices, {value: '*'}));

      assert.ok(_.find(choices, {value: 'generator-unicorn'}));
      assert.ok(_.find(choices, {value: 'generator-phoenix'}));
      assert.ok(_.find(choices, {name: 'Unicorn'}));
      assert.ok(_.find(choices, {name: 'phoenix\u001B[31m (not installed anymore)\u001B[39m'}));
    });
  });
});
