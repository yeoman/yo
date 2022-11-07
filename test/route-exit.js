'use strict';
const sinon = require('sinon');
const Router = require('../lib/router');

describe('exit route', () => {
  beforeEach(function () {
    this.router = new Router(sinon.stub());
    this.router.registerRoute('exit', require('../lib/routes/exit'));
  });
});
