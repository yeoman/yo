'use strict';
const path = require('path');
const assert = require('assert');
const _ = require('lodash');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const helpers = require('./helpers');

const Router = proxyquire('../lib/router', {
  'read-pkg-up': {
    sync(options) {
      // Turn `/phoenix/app` into `phoenix-app`
      const name = options.cwd.split(path.sep).filter(chunk => Boolean(chunk)).join('-');
      return {
        packageJson: {
          name,
          version: '0.1.0'
        }
      };
    }
  }
});

describe('Router', () => {
  beforeEach(async function () {
    this.env = await helpers.fakeEnv();
    this.env.getGeneratorsMeta = sinon.stub();
    this.router = new Router(this.env);
  });

  describe('#registerRoute()', () => {
    it('is chainable', function () {
      assert.strictEqual(this.router.registerRoute('foo', _.noop), this.router);
    });
  });

  describe('#navigate()', () => {
    beforeEach(function () {
      this.route = sinon.stub().returns(Promise.resolve());
      this.router.registerRoute('foo', this.route);
    });

    it('call a route passing router as first argument', async function () {
      await this.router.navigate('foo');
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

  describe('#updateAvailableGenerators()', () => {
    beforeEach(function () {
      this.env.getGeneratorsMeta.returns({
        'xanadu:all': {
          namespace: 'xanadu:all',
          resolved: path.join('xanadu', 'all', 'index.js')
        },
        'phoenix:app': {
          namespace: 'phoenix:app',
          resolved: path.join('phoenix', 'app', 'index.js')
        },
        'phoenix:misc': {
          namespace: 'phoenix:misc',
          resolved: path.join('phoenix', 'misc', 'index.js')
        },
        'phoenix:sub-app': {
          namespace: 'phoenix:sub-app',
          resolved: path.join('phoenix', 'sub-app', 'index.js')
        }
      });
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
