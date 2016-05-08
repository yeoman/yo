'use strict';

var path = require('path');
var execFile = require('child_process').execFile;
var parseHelp = require('parse-help');
var assign = require('lodash').assign;

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
  if (data.last !== 'yo' && !/^-/.test(data.last)) {
    return this.generator(data, done);
  }

  this.env.lookup(function (err) {
    if (err) {
      return done(err);
    }

    var meta = this.env.getGeneratorsMeta();
    var results = Object.keys(meta).map(this.item('yo'), this);
    done(null, results);
  }.bind(this));
};


/**
 * Generator completion event done
 *
 * @param {String}   data   Environment object as parsed by tabtab
 * @param {Function} done   Callback to invoke with completion results
 */
Completer.prototype.generator = function (data, done) {
  var last = data.last;
  var bin = path.join(__dirname, '../cli.js');

  execFile('node', [bin, last, '--help'], function (err, out) {
    if (err) {
      return done(err);
    }

    var results = this.parseHelp(last, out);
    done(null, results);
  }.bind(this));
};

/**
 * Helper to format completion results into { name, description } objects
 *
 * @param {String}   data   Environment object as parsed by tabtab
 * @param {Function} done   Callback to invoke with completion results
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
 * parse-help wrapper. Invokes parse-help with stdout result, returning the
 * list of completion items for flags / alias.
 *
 * @param {String}   last  Last word in COMP_LINE (completed line in command line)
 * @param {String}   out   Help output
 */
Completer.prototype.parseHelp = function (last, out) {
  var help = parseHelp(out);
  var alias = [];
  var results = Object.keys(help.flags).map(function (key) {
    var flag = help.flags[key];
    if (flag.alias) {
      alias.push(assign({}, flag, { name: flag.alias }));
    }
    flag.name = key;
    return flag;
  }).map(this.item(last, '--'), this);

  results = results.concat(alias.map(this.item(last.replace(':', '_'), '-'), this));
  results = results.filter(function (r) {
    return r.name !== '--help' && r.name !== '-h';
  });

  return results;
};
