'use strict';
import sinon from 'sinon';
import Router from '../lib/router.js';

describe('exit route', () => {
  beforeEach(function () {
    this.router = new Router(sinon.stub());
    this.router.registerRoute('exit', require('../lib/routes/exit'));
  });
});
