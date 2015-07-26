#!/usr/bin/env node
'use strict';
var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var updateNotifier = require('update-notifier');
var Insight = require('insight');
var yosay = require('yosay');
var stringLength = require('string-length');
var rootCheck = require('root-check');
var meow = require('meow');
var pkg = require('../package.json');
var Router = require('./router');

var cli = meow({
  help: false,
  pkg: pkg
});

var opts = cli.flags;
var args = cli.input;
var cmd = args[0];

// add un-camelized options too, for legacy
// TODO: remove some time in the future when generators have upgraded
Object.keys(opts).forEach(function (key) {
  var legacyKey = key.replace(/[A-Z]/g, function (m) {
    return '-' + m.toLowerCase();
  });

  opts[legacyKey] = opts[key];
});

function updateCheck() {
  var notifier = updateNotifier({pkg: pkg});
  var message = [];

  if (notifier.update) {
    message.push('Update available: ' + chalk.green.bold(notifier.update.latest) + chalk.gray(' (current: ' + notifier.update.current + ')'));
    message.push('Run ' + chalk.magenta('npm install -g ' + pkg.name) + ' to update.');
    console.log(yosay(message.join(' '), {maxLength: stringLength(message[0])}));
  }
}

function pre() {
  // debugging helper
  if (cmd === 'doctor') {
    require('yeoman-doctor')();
    return;
  }

  // easteregg
  if (cmd === 'yeoman' || cmd === 'yo') {
    console.log(require('yeoman-character'));
    return;
  }

  init();
}

function init() {
  var env = require('yeoman-environment').createEnv();

  env.on('error', function (err) {
    console.error('Error', process.argv.slice(2).join(' '), '\n');
    console.error(opts.debug ? err.stack : err.message);
    process.exit(err.code || 1);
  });

  // lookup for every namespaces, within the environments.paths and lookups
  env.lookup(function () {
    // list generators
    if (opts.generators) {
      return console.log(env.getGeneratorNames().join('\n'));
    }

    // start the interactive UI if no generator is passed
    if (!cmd) {
      if (opts.help) {
        var genList = Object.keys(env.getGeneratorsMeta()).map(function (el) {
          var parts = el.split(':');
          var first = parts.shift();
          return '  ' + (parts[0] === 'app' ? first : '  ' + parts.join(':'));
        }).join('\n');

        console.log(fs.readFileSync(path.join(__dirname, 'usage.txt'), 'utf8') + '\nAvailable Generators:\n' + genList);
        return;
      }

      runYo(env);
      return;
    }

    // Note: at some point, nopt needs to know about the generator options, the
    // one that will be triggered by the below args. Maybe the nopt parsing
    // should be done internally, from the args.
    env.run(args, opts);
  });
}

function runYo(env) {
  var router = new Router(env, insight);
  router.insight.track('yoyo', 'init');
  router.registerRoute('help', require('./routes/help'));
  router.registerRoute('update', require('./routes/update'));
  router.registerRoute('run', require('./routes/run'));
  router.registerRoute('install', require('./routes/install'));
  router.registerRoute('exit', require('./routes/exit'));
  router.registerRoute('clearConfig', require('./routes/clear-config'));
  router.registerRoute('home', require('./routes/home'));

  process.once('exit', router.navigate.bind(router, 'exit'));

  router.updateAvailableGenerators();
  router.navigate('home');
}

rootCheck('\n' + chalk.red('Easy with the `sudo`. Yeoman is the master around here.') + '\n\nSince yo is a user command, there is no need to execute it with root\npermissions. If you\'re having permission errors when using yo without sudo,\nplease spend a few minutes learning more about how your system should work\nand make any necessary repairs.\n\nA quick solution would be to change where npm stores global packages by\nputting ~/npm/bin in your PATH and running:\n' + chalk.blue('npm config set prefix ~/npm') + '\n\nSee: https://github.com/sindresorhus/guides/blob/master/npm-global-without-sudo.md');

var insightMsg = chalk.gray('==========================================================================') +
chalk.yellow('\nWe\'re constantly looking for ways to make ') + chalk.bold.red(pkg.name) +
chalk.yellow(
  ' better! \nMay we anonymously report usage statistics to improve the tool over time? \n' +
  'More info: https://github.com/yeoman/insight & http://yeoman.io'
) +
chalk.gray('\n==========================================================================');

var insight = new Insight({
  trackingCode: 'UA-31537568-1',
  pkg: pkg
});

if (opts.insight === false) {
  insight.config.set('optOut', true);
} else if (opts.insight) {
  insight.config.set('optOut', false);
}

if (opts.insight !== false) {
  if (insight.optOut === undefined) {
    insight.optOut = insight.config.get('optOut');
    insight.track('downloaded');
    insight.askPermission(insightMsg, pre);
    return;
  }
  // only track the two first subcommands
  insight.track.apply(insight, args.slice(0, 2));
}

updateCheck();
pre();
