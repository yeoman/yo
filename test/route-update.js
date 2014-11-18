'use strict';
var _ = require('lodash');
var assert = require('assert');
var env = require('yeoman-environment');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var Router = require('../lib/router');
var inquirer = require('inquirer');

describe('update route', function () {
  beforeEach(function () {
    this.sandbox = sinon.sandbox.create();
    this.insight = {
      track: sinon.stub()
    };

    this.env = env.createEnv();
    this.sandbox.stub(this.env, 'lookup', function (cb) {
      cb();
    });

    this.homeRoute = sinon.spy();
    this.router = new Router(this.env, this.insight);
    this.router.registerRoute('home', this.homeRoute);

    this.crossSpawn = sinon.stub().returns({
      on: function (name, cb) {
        cb();
      }
    });
    var updateRoute = proxyquire('../lib/routes/update', {
      'cross-spawn': this.crossSpawn
    });
    this.router.registerRoute('update', updateRoute);
  });

  afterEach(function () {
    this.sandbox.restore();
  });

  it('allows updating generators and return user to home screen', function () {
    var generators = ['generator-cat', 'generator-unicorn'];
    this.sandbox.stub(inquirer, 'prompt', function (arg, cb) {
      cb({ generators: generators });
    });
    this.router.navigate('update');

    sinon.assert.calledWith(this.crossSpawn, 'npm', ['install', '-g'].concat(generators));
    sinon.assert.calledWith(this.insight.track, 'yoyo', 'update');
    sinon.assert.calledWith(this.insight.track, 'yoyo', 'updated');
    sinon.assert.calledOnce(this.homeRoute);
    sinon.assert.calledOnce(this.env.lookup);
  });
});
