'use strict';

var debug = require('tabtab/lib/debug')('yo:completer');

/**
 * The Completer is in charge of handling `yo-complete` behavior.
 * @constructor
 * @param  {Environment} env A yeoman environment instance
 */
var Completer = module.exports = function (env) {
  this.env = env;
};

/**
 * Completion event done
 *
 * @param {String}   data   Environment object as parsed by tabtab
 * @param {Function} done   Callback to invoke with completion results
 */
Completer.prototype.complete = function (data, done) {
  debug('XXX yo complete data %j', data);
  var last = data.last.trim();

  // Completing on `yo generator <tab>`
  if (!last && data.prev !== 'yo') {
    return this.generator(data, done);
  }

  this.env.lookup(function (err) {
    if (err) {
      return done(err);
    }

    var meta = this.env.getGeneratorsMeta();
    debug('YYY yo complete meta %j', meta);
    var results = this.metaItems(meta);
    done(null, results);
  }.bind(this));
};


/**
 * Invoked when tabbing after a yeoman generator.
 *
 * noop for the moment, invoking `--help` is too slow and / or unreliable
 *
 * @param {String}   data   Environment object as parsed by tabtab
 * @param {Function} done   Callback to invoke with completion results
 */
Completer.prototype.generator = function (data, done) {
  // noop: see if we can require / inspect generators options / arguments
  return done(null, []);
};

/**
 * Helper to format completion results into { name, description } objects
 *
 * @param {String}  desc    When defined, can be used to set a static description
 * @param {String}  prefix  Used to prefix completion results (ex: --)
 */
Completer.prototype.item = function (desc, prefix) {
  prefix = prefix || '';
  return function (item) {
    var name = typeof item === 'string' ? item : item.name;
    desc = typeof item !== 'string' && item.description ? item.description : desc;
    desc = desc.replace(/^#?\s*/g, '');
    desc = desc.replace(/:/g, '->');
    desc = desc.replace(/'/g, ' ');

    return {
      name: prefix + name,
      description: desc
    };
  };
};

/**
 * Helper to format completion results for generator meta result into { name, description } objects
 *
 * @param {String}  desc    When defined, can be used to set a static description
 */
Completer.prototype.metaItems = function (metas) {
  return Object.keys(metas).map(function (key) {
    var meta = metas[key];
    var parts = meta.namespace.split(':');
    var generator = parts[0];
    var subgenerator = parts.slice(1);

    return {
      name: key,
      description: subgenerator + ' from ' + generator + ' generator'
    };
  });
};
