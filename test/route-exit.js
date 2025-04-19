import sinon from 'sinon';
import Router from '../lib/router.js';
import {exit} from '../lib/routes/exit.js';

describe('exit route', () => {
  beforeEach(function () {
    this.router = new Router({env: sinon.stub()});
    this.router.registerRoute('exit', exit);
  });
});
