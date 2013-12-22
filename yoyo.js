var fs = require('fs');
var async = require('async');
var open = require('open');
var yo = require('yeoman-generator');
var util = require('util');
var path = require('path');
var updateNotifier = require('update-notifier');
var chalk = require('chalk');
var findup = require('findup');


// The `yo yo` generator provides users with a few common, helpful commands.
var yoyo = module.exports = function yoyo(args, options) {
  yo.Base.apply(this, arguments);
  this.insight = options.insight;

  this.insight.track('yoyo', 'init');
  process.once('exit', this._exit.bind(this));
};

util.inherits(yoyo, yo.Base);


// Runs parallel `npm update -g`s for each detected generator.
yoyo.prototype._updateGenerators = function _updateGenerators() {
  var self = this;

  var resolveGenerators = function (pkg) {
    return function (next) {
      self.spawnCommand('npm', ['update', '-g', pkg.name])
        .on('error', next)
        .on('exit', next);
    };
  };

  self.insight.track('yoyo', 'update');
  async.parallel(self._.map(self.pkgs, resolveGenerators), function (err) {
    if (err) {
      self.insight.track('yoyo:err', 'update');
      return self.emit('error', err);
    }

    self.insight.track('yoyo', 'updated');
    self.home({
      refresh: true,
      message:
        'I\'ve just updated all of your generators. Remember, you can update'
        + '\na specific generator with npm by running:'
        + '\n'
        + chalk.magenta('\n    npm update -g generator-_______')
    });
  });
};


// Initializes a generator.
//
// - generator - (string) The generator to initialize.
yoyo.prototype._initGenerator = function _initGenerator(generator, done) {
  console.log(chalk.yellow('\nMake sure you\'re in the directory you want to scaffold into.\n') + 'This generator can also be run with: ' + chalk.blue.bold('yo ' + generator.split(':')[0]));

  this.insight.track('yoyo', 'run', generator);
  this.env.run(generator, done);
};


// Serves as the response prompt for "Install a generator" as well as simply
// installs a generator if a string is passed in.
//
// - pkgName - (optional) A string that matches the NPM package name.
yoyo.prototype._installGenerator = function _installGenerator(pkgName) {
  if (this._.isString(pkgName)) {
    this.insight.track('yoyo', 'install', pkgName);

    // We know what generator we want to install
    return this.spawnCommand('npm', ['install', '-g', pkgName])
      .on('error', function (err) {
        this.insight.track('yoyo:err', 'install', pkgName);
        this.emit('error', err);
      }.bind(this))
      .on('exit', function () {
        this.insight.track('yoyo', 'installed', pkgName);
        this.home({
          refresh: true,
          message:
            '\nI just installed your generator by running:'
            + '\n'
            + chalk.blue.bold('\n    npm install -g ' + pkgName)
        });
      }.bind(this));
  }

  this.insight.track('yoyo', 'install');

  this.prompt([{
    name: 'searchTerm',
    message: 'Search NPM for generators'
  }], this._searchNpm.bind(this));
};


// Grabs all of the packages with a `yeoman-generator` keyword on NPM.
//
// - term - (object) Contains the search term & gets passed back to callback().
// - cb   - Callback to execute once generators have been found.
yoyo.prototype._findAllNpmGenerators = function _findAllNpmGenerators(term, cb) {
  var url = 'http://isaacs.iriscouch.com/registry/_design/app/_view/byKeyword?startkey=[%22yeoman-generator%22]&endkey=[%22yeoman-generator%22,{}]&group_level=3';

  this.request(url, function (err, res, body) {
    if (err) {
      return this.emit('error', err);
    }

    try {
      this.npmGenerators = JSON.parse(body);
    } catch (err) {
      return this.emit('error', new Error(chalk.bold(
        'A problem occurred contacting the registry.'
        + '\nUnable to parse response: not valid JSON.'
      )));
    }

    cb(term);
  }.bind(this));
};


// Takes a search term, looks it up in the registry, prompts the user with the
// results, allowing them to choose to install it, or go back home.
//
// - term - Object with a 'searchTerm' property containing the term to search
//          NPM for.
yoyo.prototype._searchNpm = function _searchNpm(term) {
  if (!this.npmGenerators) {
    return this._findAllNpmGenerators(term, this._searchNpm.bind(this));
  }

  // Find any matches from NPM.
  var choices = this._.chain(this.npmGenerators.rows).map(function (generator) {
    // Make sure it's not already installed.
    if (!this.pkgs[generator.key[1]] && generator.key.join(' ').indexOf(term.searchTerm) > -1) {
      return {
        name: generator.key[1],
        value: generator.key[1]
      };
    }
  }.bind(this)).compact().value();

  var resultsPrompt = [{
    name: '_installGenerator',
    type: 'list',
    message: choices.length > 0
      ? 'Here\'s what I found. Install one?'
      : 'Sorry, nothing was found',
    choices: this._.union(choices, [{
      name: 'Search again',
      value: '_installGenerator'
    }, {
      name: 'Return home',
      value: 'home'
    }])
  }];

  this.prompt(resultsPrompt, function (answer) {
    if (this._.isFunction(this[answer._installGenerator])) {
      return this[answer._installGenerator]();
    }

    this._installGenerator(answer._installGenerator);
  }.bind(this));
};


// Prompts user with a few helpful resources, then opens it in their browser.
yoyo.prototype._findHelp = function _findHelp() {
  this.insight.track('yoyo', 'help');
  this.prompt([{
    name: 'whereTo',
    type: 'list',
    message:
      'Here are a few helpful resources.'
      + '\n'
      + '\nI will open the link you select in your browser for you',
    choices: [{
      name: 'Take me to the documentation',
      value: 'https://github.com/yeoman/yeoman/wiki'
    }, {
      name: 'View Frequently Asked Questions',
      value: 'https://github.com/yeoman/yeoman/wiki/FAQ'
    }, {
      name: 'File an issue on GitHub',
      value: 'https://github.com/yeoman/yeoman/blob/master/contributing.md#issue-submission'
    }, {
      name: 'Take me back home, Yo!',
      value: {
        method: 'home',
        args: {
          message: 'I get it, you like learning on your own. I respect that.'
        }
      }
    }]
  }], function (answer) {
    this.insight.track('yoyo', 'help', answer);

    if (this._.isFunction(this[answer.whereTo.method])) {
      this[answer.whereTo.method](answer.whereTo.args);
    } else {
      open(answer.whereTo);
    }
  }.bind(this));
};


// Serves as a quick escape from the `yo yo` prompts.
yoyo.prototype._exit = function _exit() {
  this.insight.track('yoyo', 'exit');

  console.log(
      '\nBye from us! Chat soon.'
    + '\n'
    + '\n            Add' + chalk.red.bold('y') + ' Osmani'
    + '\n          Sindr' + chalk.red.bold('e') + ' Sorhus'
    + '\n        Brian F' + chalk.red.bold('o') + 'rd'
    + '\n     Eric Bidel' + chalk.red.bold('m') + 'an'
    + '\n              P' + chalk.red.bold('a') + 'ul Irish'
    + '\n     Mickael Da' + chalk.red.bold('n') + 'iel'
    + '\n          Pasca' + chalk.yellow.bold('1') + ' Hartig'
    + '\n      Stephen S' + chalk.cyan.bold('.') + 'wchuk'
    + '\n    Frederick R' + chalk.yellow.bold('0') + 's'
    + '\n');
};


// I'm sorry...
yoyo.prototype._noop = function _noop() {};


// Rolls through all of the generators provided by `env.generators`, finding
// their `package.json` files, then storing them internally in `this.pkgs`.
yoyo.prototype.findGenerators = function findGenerators() {
  this.pkgs = {};

  var resolveGenerators = function (generator) {
    if (!/(app|all)$/.test(generator.namespace)) {
      return;
    }

    var dir = findup.sync(generator.resolved, 'package.json');
    if (!dir) {
      return;
    }

    var pkg = yo.file.readJSON(path.join(dir, 'package.json'));
    pkg.namespace = generator.namespace;
    pkg.appGenerator = true;
    pkg.prettyName = generator.namespace.replace(/(\w+):\w+/, '$1');
    pkg.prettyName = pkg.prettyName.charAt(0).toUpperCase() + pkg.prettyName.slice(1);

    pkg.update = updateNotifier({
      packageName: pkg.name,
      packageVersion: pkg.version
    }).update;

    if (pkg.update && pkg.version !== pkg.update.latest) {
      pkg.updateAvailable = true;
    }

    this.pkgs[pkg.name] = pkg;
  };

  this._.each(this.env.getGeneratorsMeta(), resolveGenerators, this);
};


// Display the home `yo` screen, with the intial set of options.
//
// - options - (optional)
//           - message (string) - String to print before prompt.
//           - refresh (bool) - Spawn a new `yo` command.
yoyo.prototype.home = function home(options) {
  var done = this.async();

  options = options || {};

  if (options.refresh) {
    this.env.lookup();
    this.findGenerators();
  }

  if (options.message) {
    console.log('\n' + chalk.cyan(options.message) + '\n');
  }

  var defaultChoices = [{
    name: 'Install a generator',
    value: {
      method: '_installGenerator'
    }
  }, {
    name: 'Find some help',
    value: {
      method: '_findHelp'
    }
  }, {
    name: 'Get me out of here!',
    value: {
      method: '_noop'
    }
  }];

  var generatorList = this._.chain(this.pkgs).map(function (generator) {
    if (!generator.appGenerator) {
      return;
    }

    var versionInfo = chalk.gray('(' + generator.version + ')');

    if (generator.updateAvailable) {
      versionInfo += chalk.yellow(' Update Available! ') + chalk.red('(' + generator.update.latest + ')');
    }

    return {
      name: 'Run the ' + generator.prettyName + ' generator ' + versionInfo,
      value: {
        method: '_initGenerator',
        args: generator.namespace
      }
    };
  }).compact().value();

  if (generatorList.length) {
    defaultChoices.unshift({
      name: 'Update your generators',
      value: {
        method: '_updateGenerators'
      }
    });
  }

  this.insight.track('yoyo', 'home');
  this.prompt([{
    name: 'whatNext',
    type: 'list',
    message: 'What would you like to do?',
    choices: this._.union(generatorList, new yo.inquirer.Separator(), defaultChoices)
  }], function (answer) {
    this[answer.whatNext.method](answer.whatNext.args, done);
  }.bind(this));
};
