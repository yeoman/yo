'use strict';
var path = require('path');
var _ = require('lodash');
var titleize = require('titleize');
var humanizeString = require('humanize-string');
var readPkgUp = require('read-pkg-up');
var updateNotifier = require('update-notifier');
var Configstore = require('configstore');
var namespaceToName = require('yeoman-environment').namespaceToName;

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

/**
 * Update the available generators in the app
 * TODO: Move this function elsewhere, try to make it stateless.
 */
Router.prototype.updateAvailableGenerators = function () {
  this.generators = {};

  var resolveGenerators = function (generator) {
    // Skip sub generators
    if (!/:(app|all)$/.test(generator.namespace)) {
      return;
    }

    var pkg = readPkgUp.sync({cwd: path.dirname(generator.resolved)}).pkg;

    if (!pkg) {
      return;
    }

    pkg.namespace = generator.namespace;
    pkg.appGenerator = true;
    pkg.prettyName = titleize(humanizeString(namespaceToName(generator.namespace)));

    pkg.update = updateNotifier({pkg: pkg}).update;

    if (pkg.update && pkg.version !== pkg.update.latest) {
      pkg.updateAvailable = true;
    }

    this.generators[pkg.name] = pkg;
  };

  _.each(this.env.getGeneratorsMeta(), resolveGenerators, this);
};
