'use strict';
var assert = require('assert');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var _ = require('lodash');
var Promise = require('pinkie-promise');
var inquirer = require('inquirer');
var Router = require('../lib/router');
var helpers = require('./helpers');

describe('clear config route', function () {
  beforeEach(function () {
    this.sandbox = sinon.sandbox.create();
    this.insight = helpers.fakeInsight();
    this.globalConfig = {
      remove: sinon.stub(),
      removeAll: sinon.stub(),
      getAll: function () {
        return {
          'generator-phoenix': {},
          'generator-unicorn': {}
        };
      }
    };
    var conf = {
      get: function () {
        return {
          unicorn: 20,
          phoenix: 10
        };
      }
    };
    this.homeRoute = sinon.spy();
    this.router = new Router(sinon.stub(), this.insight, conf);
    this.router.registerRoute('home', this.homeRoute);
    var clearConfig = proxyquire('../lib/routes/clear-config', {
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
    return this.router.navigate('clearConfig').then(function () {
      sinon.assert.calledOnce(this.homeRoute);
    }.bind(this));
  });

  it('track page and answer', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(
      Promise.resolve({whatNext: 'generator-angular:0.0.0'})
    );
    return this.router.navigate('clearConfig').then(function () {
      sinon.assert.calledWith(this.insight.track, 'yoyo', 'clearGlobalConfig');
      sinon.assert.calledWith(
        this.insight.track,
        'yoyo',
        'clearGlobalConfig',
        {whatNext: 'generator-angular:0.0.0'}
      );
    }.bind(this));
  });

  it('allows clearing a generator and return user to home screen', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whatNext: 'foo'}));
    this.router.navigate('clearConfig').then(function () {
      sinon.assert.calledOnce(this.globalConfig.remove);
      sinon.assert.calledWith(this.globalConfig.remove, 'foo');
      sinon.assert.calledOnce(this.homeRoute);
    }.bind(this));
  });

  it('allows clearing all generators and return user to home screen', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whatNext: '*'}));
    return this.router.navigate('clearConfig').then(function () {
      sinon.assert.calledOnce(this.globalConfig.removeAll);
      sinon.assert.calledOnce(this.homeRoute);
    }.bind(this));
  });

  it('shows generator with global config entry', function () {
    var choices = [];

    this.sandbox.stub(inquirer, 'prompt', function (arg) {
      choices = arg[0].choices;
      return Promise.resolve({whatNext: 'foo'});
    });
    return this.router.navigate('clearConfig').then(function () {
      // Clear all generators entry is present
      assert.ok(_.find(choices, {value: '*'}));

      assert.ok(_.find(choices, {value: 'generator-unicorn'}));
      assert.ok(_.find(choices, {value: 'generator-phoenix'}));
      assert.ok(_.find(choices, {name: 'Unicorn'}));
      assert.ok(_.find(choices, {name: 'phoenix\u001b[31m (not installed anymore)\u001b[39m'}));
    });
  });
});
