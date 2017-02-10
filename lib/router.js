'use strict';
var Configstore = require('configstore');

/**
 * The router is in charge of handling `yo` different screens.
 * @constructor
 * @param  {Environment} env A yeoman environment instance
 * @param  {Insight} insight An insight instance
 * @param  {Configstore} [conf] An optionnal config store instance
 */
var Router = module.exports = function (env, insight, conf) {
  var pkg = require('../package.json');
  this.routes = {};
  this.env = env;
  this.insight = insight;
  this.conf = conf || new Configstore(pkg.name, {
    generatorRunCount: {}
  });
};

/**
 * Navigate to a route
 * @param  {String} name Route name
 * @param  {*}      arg  A single argument to pass to the route handler
 */
Router.prototype.navigate = function (name, arg) {
  if (typeof this.routes[name] === 'function') {
    return this.routes[name].call(null, this, arg);
  }

  throw new Error('no routes called: ' + name);
};

/**
 * Register a route handler
 * @param {String}   name    Name of the route
 * @param {Function} handler Route handler
 */
Router.prototype.registerRoute = function (name, handler) {
  this.routes[name] = handler;
  return this;
};
