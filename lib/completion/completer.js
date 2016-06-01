'use strict';

var debug = require('tabtab/lib/debug')('yo:completer');

var YO_OPTS = [
  {name: '-f', description: 'Overwrite files that already exist'},
  {name: '--force', description: 'Overwrite files that already exist'},
  {name: '--generators', description: 'Print available generators'},
  {name: '--help', description: 'Print this info and generator\'s options and usage'},
  {name: '--insight', description: 'Toggle anonymous tracking'},
  {name: '--no-color', description: 'Disable colors'},
  {name: '--no-insight', description: 'Toggle anonymous tracking'},
  {name: '--version', description: 'Print version'}
];

/**
 * The Completer is in charge of handling `yo-complete` behavior.
 * @constructor
 * @param  {Environment} env A yeoman environment instance
 */
var Completer = module.exports = function (env) {
  this.env = env;
};

/**
 * This is the completion handler.
 *
 * The first word must be a generator or flags for the yo cli itself.
 * If the first word is a generator then subsequent words will be
 * generator specific.
 * If the first word is not a generator then remaining words will
 * simply be arguments and options provided by the yo clie itself.
 *
 * @param {String}   data   Environment object as parsed by tabtab
 * @param {Function} done   Callback to invoke with completion results
 */
Completer.prototype.complete = function (data, done) {
  debug('XXX yo complete data %j', data);
  var hasFirstArg = (data && data.args && data.args.length > 3);
  debug('FFF %s', (hasFirstArg ? 'true' : 'false'));
  var last = data.last.trim();

  this.env.lookup(function () {
    var meta = this.env.getGeneratorsMeta();
    debug('MMM yo complete meta %j', meta);
    var generator = (hasFirstArg ? this.getGeneratorFromMeta(data.args[3], meta) : undefined);
    debug('GGG %s', generator);

    // Completing on `yo <tab>`
    if (data.words == 1) {
      var results = this.metaItems(meta);
      done(null, results.concat(YO_OPTS));
    }
    // Completing for a sub/generator
    else if (generator) {
      return this.handleGenerator(generator, data, done);
    }
    // Completing on yo options
    else {
      done(null, YO_OPTS);
    }
  }.bind(this));

};

Completer.prototype.getGeneratorFromMeta = function (name, meta) {
  var genName = name;
  if (name.indexOf(':') === -1) {
    genName += ':app';
  }
  return meta[genName];
}

/**
 * Invoked when tabbing after a yeoman generator.
 *
 * @param {Object}   generator Generator meta to provide completion for
 * @param {String}   data      Environment object as parsed by tabtab
 * @param {Function} done      Callback to invoke with completion results
 */
Completer.prototype.handleGenerator = function (generator, data, done) {
  debug('Looking for generator %s > %s', generator.namespace, generator.resolved);
  var gen = this.env.create(generator.namespace);
  debug('AAA %j', gen);

  var opts = [];
  Object.keys(gen._options).forEach(function (key) {
    var option = gen._options[key];
    var name = option.name;
    if (name.indexOf('--') !== 0) {
      name = '--' + name;
    }
    opts.push({
      name: name,
      description: option.desc
    });
    if (option.alias) {
      var alias = option.alias;
      if (alias.indexOf('-') !== 0) {
        alias = '-' + alias;
      }
      opts.push({
        name: alias,
        description: option.desc
      });
    }
  });
  return done(null, opts);
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
    var subgenerator = parts[1];

    if (subgenerator === 'app') {
      key = generator;
    }

    return {
      name: key,
      description: subgenerator + ' from ' + generator + ' generator'
    };
  });
};
