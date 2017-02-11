'use strict';
const sinon = require('sinon');
const Router = require('../lib/router');
const helpers = require('./helpers');

describe('exit route', () => {
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
