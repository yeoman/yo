'use strict';
var sinon = require('sinon');
var Router = require('../lib/router');
var helpers = require('./helpers');

describe('exit route', function () {
  beforeEach(function () {
    this.insight = helpers.fakeInsight();
    this.router = new Router(sinon.stub(), this.insight);
    this.router.registerRoute('exit', require('../lib/routes/exit'));
  });

  it('track exits', function () {
    this.router.navigate('exit');
    sinon.assert.calledWith(this.insight.track, 'yoyo', 'exit');
  });
});
