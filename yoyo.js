'use strict';
var Router = require('./lib/router');

function initRouter(generator) {
  var router = new Router(generator.env, generator.insight);
  router.insight.track('yoyo', 'init');
  router.registerRoute('help', require('./lib/routes/help'));
  router.registerRoute('update', require('./lib/routes/update'));
  router.registerRoute('run', require('./lib/routes/run'));
  router.registerRoute('install', require('./lib/routes/install'));
  router.registerRoute('exit', require('./lib/routes/exit'));
  router.registerRoute('clearConfig', require('./lib/routes/clear-config'));
  router.registerRoute('home', require('./lib/routes/home'));

  process.once('exit', router.navigate.bind(router, 'exit'));

  return router;
}

// The `yo yo` generator provides users with a few common, helpful commands.
var yoyo = module.exports = function () {
  this.insight = this.options.insight;
  this.router = initRouter(this);
  this.router.updateAvailableGenerators();
  this.router.navigate('home');
};
