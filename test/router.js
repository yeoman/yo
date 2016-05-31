'use strict';
var assert = require('assert');
var _ = require('lodash');
var sinon = require('sinon');
var helpers = require('./helpers');
var proxyquire = require('proxyquire');
var path = require('path');
var Router = proxyquire('../lib/router', {
  'read-pkg-up': {
    sync: function (options) {
      // turn /phoenix/app into phoenix-app
      var name = options.cwd.split(path.sep).filter(function (chunk) {
        return !!chunk;
      }).join('-');
      return {
        pkg: {
          name: name,
          version: '0.1.0'
        }
      };
    }
  }
});

describe('Router', function () {
  beforeEach(function () {
    this.env = helpers.fakeEnv();
    this.env.getGeneratorsMeta = sinon.stub();
    this.router = new Router(this.env);
  });

  describe('#registerRoute()', function () {
    it('is chainable', function () {
      assert.equal(this.router.registerRoute('foo', _.noop), this.router);
    });
  });

  describe('#navigate()', function () {
    beforeEach(function () {
      this.route = sinon.spy();
      this.router.registerRoute('foo', this.route);
    });

    it('call a route passing router as first argument', function () {
      this.router.navigate('foo');
      sinon.assert.calledWith(this.route, this.router);
      sinon.assert.calledOnce(this.route);
    });

    it('call a route passing arguments', function () {
      this.router.navigate('foo', 'dummy');
      sinon.assert.calledWith(this.route, this.router, 'dummy');
      sinon.assert.calledOnce(this.route);
    });

    it('throws on invalid route name', function () {
      assert.throws(this.router.navigate.bind(this.route, 'invalid route name'));
    });
  });

  describe('#updateAvailableGenerators()', function () {
    beforeEach(function () {
      this.env.getGeneratorsMeta.returns([
        {
          namespace: 'xanadu:all',
          resolved: '/xanadu/all/index.js'
        },
        {
          namespace: 'phoenix:app',
          resolved: '/phoenix/app/index.js'
        },
        {
          namespace: 'phoenix:misc',
          resolved: '/phoenix/misc/index.js'
        },
        {
          namespace: 'phoenix:sub-app',
          resolved: '/phoenix/sub-app/index.js'
        }
      ]);
    });

    it('finds generators where an `all` generator is implemented', function () {
      this.router.updateAvailableGenerators();
      assert.ok(this.router.generators['xanadu-all'], 'xanadu:all found');
    });

    it('finds generators where an `app` generator is implemented', function () {
      this.router.updateAvailableGenerators();
      assert.ok(this.router.generators['phoenix-app'], 'phoenix:app found');
    });

    it('ignores sub-generators', function () {
      this.router.updateAvailableGenerators();
      assert.ok(!this.router.generators['phoenix-misc'], 'phoenix:misc ignored');
      assert.ok(!this.router.generators['phoenix-sub-app'], 'phoenix:sub-app ignored');
    });
  });
});
