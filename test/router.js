'use strict';
var assert = require('assert');
var _ = require('lodash');
var sinon = require('sinon');
var Router = require('../lib/router');

describe('Router', function () {
  beforeEach(function () {
    this.router = new Router(sinon.stub());
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
});
