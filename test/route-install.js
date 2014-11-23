'use strict';
var _ = require('lodash');
var assert = require('assert');
var inquirer = require('inquirer');
var nock = require('nock');
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var Router = require('../lib/router');
var urls = require('../lib/utils/urls');
var helpers = require('./helpers');

describe('install route', function () {
  beforeEach(function () {
    this.sandbox = sinon.sandbox.create();
    this.insight = helpers.fakeInsight();

    this.env = helpers.fakeEnv();

    this.homeRoute = sinon.spy();
    this.router = new Router(this.env, this.insight);
    this.router.registerRoute('home', this.homeRoute);

    this.spawn = helpers.fakeCrossSpawn('close');
    var installRoute = proxyquire('../lib/routes/install', {
      'cross-spawn': this.spawn
    });
    this.router.registerRoute('install', installRoute);
    this.env.registerStub(_.noop, 'generator-unicorn');
  });

  afterEach(function () {
    this.sandbox.restore();
  });

  describe('NPM success with results', function () {
    beforeEach(function () {
      this.rows = [
        { key: ['yeoman-generator', 'generator-unicorn', 'some unicorn'] },
        { key: ['yeoman-generator', 'generator-unrelated', 'some description'] },
        { key: ['yeoman-generator', 'generator-unicorn-1', 'foo description'] },
        { key: ['yeoman-generator', 'generator-foo', 'description with unicorn word'] }
      ];
      this.pkgData = { author: { name: 'Simon' } };

      nock(urls.npm.domain)
        .get(urls.npm.keyword('yeoman-generator').replace(urls.npm.domain, ''))
          .reply(200, { rows: this.rows })
        .filteringPath(/\/registry\/[^\?]+$/g, '/registry/pkg')
          .get('/registry/pkg')
          .times(2)
          .reply(200, this.pkgData);
    });

    it('filters already installed generators and match search term', function (done) {
      var call = 0;
      this.sandbox.stub(inquirer, 'prompt', function (arg, cb) {
        call++;
        if (call === 1) {
          return cb({ searchTerm: 'unicorn' });
        }
        if (call === 2) {
          var choices = arg[0].choices;
          assert.equal(_.where(choices, { value: 'generator-foo' }).length, 1);
          assert.equal(_.where(choices, { value: 'generator-unicorn-1' }).length, 1);
          assert.equal(_.where(choices, { value: 'generator-unicorn' }).length, 0);
          assert.equal(_.where(choices, { value: 'generator-unrelated' }).length, 0);
          done();
        }
      });

      this.router.navigate('install');
    });

    it('allow redo the search', function (done) {
      var call = 0;
      this.sandbox.stub(inquirer, 'prompt', function (arg, cb) {
        call++;
        if (call === 1) {
          return cb({ searchTerm: 'unicorn' });
        }
        if (call === 2) {
          return cb({ toInstall: 'install' });
        }
        if (call === 3) {
          assert.equal(arg[0].name, 'searchTerm');
          done();
        }
      });

      this.router.navigate('install');
    });

    it('allow going back home', function (done) {
      var call = 0;
      this.sandbox.stub(inquirer, 'prompt', function (arg, cb) {
        call++;
        if (call === 1) {
          return cb({ searchTerm: 'unicorn' });
        }
        if (call === 2) {
          cb({ toInstall: 'home' });
          sinon.assert.calledOnce(this.homeRoute);
          done();
        }
      }.bind(this));

      this.router.navigate('install');
    });

    it('install a generator and return home updating run menu', function (done) {
      var call = 0;
      this.sandbox.stub(inquirer, 'prompt', function (arg, cb) {
        call++;
        if (call === 1) {
          return cb({ searchTerm: 'unicorn' });
        }
        if (call === 2) {
          cb({ toInstall: 'generator-unicorn' });
          sinon.assert.calledWith(this.spawn, 'npm', ['install', '-g', 'generator-unicorn'], { stdio: 'inherit' });
          sinon.assert.calledOnce(this.spawn);
          sinon.assert.calledOnce(this.homeRoute);
          done();
        }
      }.bind(this));

      this.router.navigate('install');
    });
  });

  describe('NPM success without results', function () {
    beforeEach(function () {
      this.rows = [
        { key: ['yeoman-generator', 'generator-unrelated', 'some description'] },
        { key: ['yeoman-generator', 'generator-unrelevant', 'some description'] },
      ];

      nock(urls.npm.domain)
        .get(urls.npm.keyword('yeoman-generator').replace(urls.npm.domain, ''))
        .reply(200, { rows: this.rows });
    });

    it('list options if search have no results', function (done) {
      var call = 0;
      this.sandbox.stub(inquirer, 'prompt', function (arg, cb) {
        call++;
        if (call === 1) {
          return cb({ searchTerm: 'unicorn' });
        }
        if (call === 2) {
          var choices = arg[0].choices;
          assert.deepEqual(_.pluck(choices, 'value'), ['install', 'home']);
          done();
        }
      });

      this.router.navigate('install');
    });
  });
});
