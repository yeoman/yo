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
var list = require('cli-list');
var pkg = require('../package.json');
var Router = require('./router');
var gens = list(process.argv.slice(2));

/* eslint new-cap: 0, no-extra-parens: 0 */
var tabtab = new (require('tabtab').Commands.default)({
  name: 'yo',
  completer: 'yo-complete'
});

var cli = gens.map(function (gen) {
  var minicli = meow({ help: false, pkg: pkg, argv: gen });
  var opts = minicli.flags;
  var args = minicli.input;

  // add un-camelized options too, for legacy
  // TODO: remove some time in the future when generators have upgraded
  Object.keys(opts).forEach(function (key) {
    var legacyKey = key.replace(/[A-Z]/g, function (m) {
      return '-' + m.toLowerCase();
    });

    opts[legacyKey] = opts[key];
  });

  return { opts: opts, args: args };
});

var firstCmd = cli[0] || { opts: {}, args: {} };
var cmd = firstCmd.args[0];
var insight;

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

  if (cmd === 'completion') {
    return tabtab.install();
  }

  // easteregg
  if (cmd === 'yeoman' || cmd === 'yo') {
    console.log(require('yeoman-character'));
    return;
  }

  init();
}

function createGeneratorList(env) {
  var generators = Object.keys(env.getGeneratorsMeta()).reduce(function (namesByGenerator, generator) {
    var parts = generator.split(':');
    var generatorName = parts.shift();
    // If first time we found this generator, prepare to save all its sub-generators
    if (!namesByGenerator[generatorName]) {
      namesByGenerator[generatorName] = [];
    }
    // If sub-generator (!== app), save it
    if (parts[0] !== 'app') {
      namesByGenerator[generatorName].push(parts.join(':'));
    }

    return namesByGenerator;
  }, {});

  if (!Object.keys(generators).length) {
    return '  Couldn\'t find any generators, did you install any? Troubleshoot issues by running\n\n  $ yo doctor';
  }

  return Object.keys(generators).map(function (generator) {
    var subGenerators = generators[generator].map(function (subGenerator) {
      return '    ' + subGenerator;
    }).join('\n');

    return '  ' + generator + '\n' + subGenerators;
  }).join('\n');
}

function init() {
  var env = require('yeoman-environment').createEnv();

  env.on('error', function (err) {
    console.error('Error', process.argv.slice(2).join(' '), '\n');
    console.error(firstCmd.opts.debug ? err.stack : err.message);
    process.exit(err.code || 1);
  });

  // lookup for every namespaces, within the environments.paths and lookups
  env.lookup(function () {
    var generatorList = createGeneratorList(env);

    // list generators
    if (firstCmd.opts.generators) {
      console.log('Available Generators:\n\n' + generatorList);
      return;
    }

    // start the interactive UI if no generator is passed
    if (!cmd) {
      if (firstCmd.opts.help) {
        var usageText = fs.readFileSync(path.join(__dirname, 'usage.txt'), 'utf8');
        console.log(usageText + '\nAvailable Generators:\n\n' + generatorList);
        return;
      }

      runYo(env);
      return;
    }

    // Note: at some point, nopt needs to know about the generator options, the
    // one that will be triggered by the below args. Maybe the nopt parsing
    // should be done internally, from the args.
    cli.forEach(function (gen) {
      env.run(gen.args, gen.opts);
    });
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

insight = new Insight({
  trackingCode: 'UA-31537568-1',
  pkg: pkg
});

if (firstCmd.opts.insight === false) {
  insight.config.set('optOut', true);
} else if (firstCmd.opts.insight) {
  insight.config.set('optOut', false);
}

if (firstCmd.opts.insight !== false && insight.optOut === undefined) {
  insight.optOut = insight.config.get('optOut');
  insight.track('downloaded');
  insight.askPermission(insightMsg, pre);
} else {
  if (firstCmd.opts.insight !== false) {
    // only track the two first subcommands
    insight.track.apply(insight, firstCmd.args.slice(0, 2));
  }

  updateCheck();
  pre();
}
