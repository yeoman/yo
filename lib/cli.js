#!/usr/bin/env node
'use strict';
var chalk = require('chalk');
var pkg = require('../package.json');

var cli = require('meow')({
  help: null,
  pkg: pkg
});

var opts = cli.flags;
var args = cli.input;
var cmd = args[0];

function pre() {
  if (opts.version) {
    return console.log(pkg.version);
  }

  // debugging helper
  if (cmd === 'doctor') {
    return require('yeoman-doctor').run();
  }

  // easteregg
  if (cmd === 'yeoman' || cmd === 'yo') {
    return console.log(require('yeoman-character'));
  }

  init();
}

function init() {
  var env = require('yeoman-environment').createEnv();

  // DEPRECATED
  // TODO: remove in the future
  env.alias(/^([^:]+)$/, '$1:all');

  env.on('error', function (err) {
    console.error('Error', process.argv.slice(2).join(' '), '\n');
    console.error(opts.debug ? err.stack : err.message);
    process.exit(err.code || 1);
  });

  // lookup for every namespaces, within the environments.paths and lookups
  env.lookup(function () {
    // list generators
    if (opts.generators) {
      return console.log(require('./utils').generatorsFromEnv(env).join('\n'));
    }

    // If no generator is passed, then start the Yo UI
    if (!cmd) {
      if (opts.help) {
        return console.log(
          require('fs').readFileSync(
            require('path').join(__dirname, 'usage.txt'),  'utf8'
          )
        );
      }

      return runYo(env);
    }

    // Note: at some point, nopt needs to know about the generator options, the
    // one that will be triggered by the below args. Maybe the nopt parsing
    // should be done internally, from the args.
    env.run(args, opts);
  });
}

function runYo(env) {
  var router = new (require('./router'))(env, insight);
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

require('root-check')([
  '',
  chalk.red('Easy with the `sudo`. Yeoman is the master around here.'),
  '',
  'Since ' + chalk.green('yo') + ' is a user command, there is no need to execute it with root permissions. If you have permission errors when using yo without sudo, please spend a few minutes learning more about how your system should work and make any necessary repairs.',
  '',
  'A quick solution would be to change where npm stores global packages by putting ~/npm/bin in your PATH and running:',
  chalk.blue('npm config set prefix ~/npm'),
  '',
  'See: https://github.com/sindresorhus/guides/blob/master/npm-global-without-sudo.md'
].join('\n'));

var insightMsg = chalk.gray('==========================================================================') +
chalk.yellow('\nWe are constantly looking for ways to make ') + chalk.bold.red(pkg.name) +
chalk.yellow(
  ' better! \nMay we anonymously report usage statistics to improve the tool over time? \n' +
  'More info: https://github.com/yeoman/insight & http://yeoman.io'
) +
chalk.gray('\n==========================================================================');

var insight = new (require('insight'))({
  trackingCode: 'UA-31537568-1',
  packageName: pkg.name,
  packageVersion: pkg.version
});

insight.config.set('optOut', opts.insight === false);

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

if (opts['update-notifier'] !== false) {
  var notifier = require('update-notifier')({
    packageName: pkg.name,
    packageVersion: pkg.version
  });

  var message = [];

  if (notifier.update) {
    message.push(
      'Update available: ' +
      chalk.green.bold(notifier.update.latest) +
      chalk.gray(' (current: ' + notifier.update.current + ')')
    );
    message.push(
      'Run ' + chalk.magenta('npm install -g ' + pkg.name) + ' to update.'
    );
    console.log(
      require('yosay')(message.join(' '), {
        maxLength: require('string-length')(message[0])
      })
    );
  }
}

pre();
