'use strict';
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var _s = require('underscore.string');
var findup = require('findup');
var updateNotifier = require('update-notifier');
var Configstore = require('configstore');
var pkg = require('../package.json');
var namespaceToName = require('./utils').namespaceToName;

/**
 * The router is in charge of handling `yo` different screens.
 * @constructor
 * @param  {Environment} env A yeoman environment instance
 * @param  {Insight} insight An insight instance
 * @param  {Configstore} [conf] An optionnal config store instance
 */
var Router = module.exports = function (env, insight, conf) {
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
  if (_.isFunction(this.routes[name])) {
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
    if (!/(app|all)$/.test(generator.namespace)) {
      return;
    }

    var dir = findup.sync(generator.resolved, 'package.json');
    if (!dir) {
      return;
    }

    var pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    pkg.namespace = generator.namespace;
    pkg.appGenerator = true;
    pkg.prettyName = _s.titleize(_s.humanize(namespaceToName(generator.namespace)));

    pkg.update = updateNotifier({
      packageName: pkg.name,
      packageVersion: pkg.version
    }).update;

    if (pkg.update && pkg.version !== pkg.update.latest) {
      pkg.updateAvailable = true;
    }

    this.generators[pkg.name] = pkg;
  };

  _.each(this.env.getGeneratorsMeta(), resolveGenerators, this);
};
