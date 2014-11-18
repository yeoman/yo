/* jshint onevar:false */
'use strict';
var async = require('async');
var opn = require('opn');
var gen = require('yeoman-generator');
var yosay = require('yosay');
var util = require('util');
var path = require('path');
var fs = require('fs');
var updateNotifier = require('update-notifier');
var chalk = require('chalk');
var fullname = require('fullname');
var namespaceToName = require('./lib/utils').namespaceToName;
var _s = require('underscore.string');
var Configstore = require('configstore');
var userHome = require('user-home');
var pkg = require('./package.json');
var Router = require('./lib/router');
var conf = new Configstore(pkg.name, {
  generatorRunCount: {}
});


// Returns global config path which is located in the user home directory
function globalConfigPath() {
  return path.join(userHome, '.yo-rc-global.json');
}

function writeGlobalConfigFile(content) {
  fs.writeFileSync(globalConfigPath(), JSON.stringify(content, null, '  '));
}

function getGlobalConfig() {
  var storePath = globalConfigPath();
  if (fs.existsSync(storePath)) {
    return JSON.parse(fs.readFileSync(storePath, 'utf8'));
  }
  return {};
}

function initRouter(generator) {
  var router = new Router(generator.env, generator.insight);
  router.insight.track('yoyo', 'init');
  router.registerRoute('help', require('./lib/routes/help'));
  router.registerRoute('update', require('./lib/routes/update'));
  router.registerRoute('home', function () {
    generator.home();
  });
  return router;
}

// The `yo yo` generator provides users with a few common, helpful commands.
var yoyo = module.exports = function (args, options) {
  gen.Base.apply(this, arguments);
  this.insight = options.insight;
  this.router = initRouter(this);

  process.once('exit', this._exit.bind(this));
};

util.inherits(yoyo, gen.Base);

// Prompts the user to select which generators to update
yoyo.prototype._promptToUpdateGenerators = function () {
  this.router.navigate('update');
};

// Initializes a generator.
//
// - generator - (string) The generator to initialize.
yoyo.prototype._initGenerator = function (generator, done) {
  console.log(
    chalk.yellow('\nMake sure you are in the directory you want to scaffold into.\n') +
    chalk.dim('This generator can also be run with: ' +
    chalk.blue('yo ' + generator.split(':')[0]) + '\n')
  );

  // save the generator run count
  var generatorName = namespaceToName(generator);
  var generatorRunCount = conf.get('generatorRunCount');
  generatorRunCount[generatorName] = typeof generatorRunCount[generatorName] === 'number' ?
    ++generatorRunCount[generatorName] : 1;
  conf.set('generatorRunCount', generatorRunCount);

  this.insight.track('yoyo', 'run', generator);
  this.composeWith(generator);
  done();
};


// Serves as the response prompt for "Install a generator" as well as simply
// installs a generator if a string is passed in.
//
// - pkgName - (optional) A string that matches the NPM package name.
yoyo.prototype._installGenerator = function (pkgName) {
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
            '\nI just installed a generator by running:\n' +
            chalk.blue.bold('\n    npm install -g ' + pkgName)
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
yoyo.prototype._findAllNpmGenerators = function (term, cb) {
  var url = 'http://isaacs.iriscouch.com/registry/_design/' +
    'app/_view/byKeyword?startkey=[%22yeoman-generator%22]' +
    '&endkey=[%22yeoman-generator%22,{}]&group_level=3';

  this.request(url, function (err, res, body) {
    if (err) {
      this.emit('error', err);
      return;
    }

    try {
      this.npmGenerators = JSON.parse(body);
    } catch (err) {
      return this.emit('error', new Error(chalk.bold(
        'A problem occurred contacting the registry.' +
        '\nUnable to parse response: not valid JSON.'
      )));
    }

    cb(term);
  }.bind(this));
};

// Grab out name, and author from git repo of the generator
//
// - generator - (object) Contains npm registry json object.
// - cb   - Callback to execute once generators have been processed.
yoyo.prototype._handleRow = function(generator,cb){
  var url = 'https://skimdb.npmjs.com/registry/' + generator.key[1];
  this.request({url: url, json: true}, function (err, res, body) {
    if (!err && res.statusCode === 200) {
      var packageType = this._isYeomanPackage(body);
      cb(null, {
        name: generator.key[1].replace(/^generator-/, '') + packageType,
        value: generator.key[1],
        author: packageType ? body.author.name : ''
      });
    } else {
      cb(new Error('GitHub fetch failed\n' + err + '\n' + body));
    }
  }.bind(this));
};

// Determine if NPM package is a yeoman package
// - body - object containing github repo information
yoyo.prototype._isYeomanPackage = function(body){
  return body.author &&
  body.author.name === 'The Yeoman Team' ? chalk.green(' :{') : '';
};

//Sorts the NPM Packages in alphabetical order
// - a - first compared NPM package
// - b - second compared NPM package
yoyo.prototype._sortNPMPackage = function(a,b){
      if (a.name < b.name){
         return -1;
      }
      if (a.name > b.name){
        return 1;
      }
      return 0;
};
// Takes a search term, looks it up in the registry, prompts the user with the
// results, allowing them to choose to install it, or go back home.
//
// - term - Object with a 'searchTerm' property containing the term to search
//          NPM for.
yoyo.prototype._searchNpm = function (term) {
  if (!this.npmGenerators) {
    return this._findAllNpmGenerators(term, this._searchNpm.bind(this));
  }

  var pkgs = this.pkgs;
  // Find any matches from NPM.
  var availableGenerators = this.npmGenerators.rows.filter(function(generator){
    return !pkgs[generator.key[1]] && generator.key.join(' ').indexOf(term.searchTerm) > -1;
  });

  async.map(availableGenerators, this._handleRow.bind(this), function(err, choices){
    choices.sort(this._sortNPMPackage);

    var introMessage = 'Sorry, nothing was found';

    if (choices.length > 0){
      introMessage = 'Here\'s what I found. (' + chalk.green(':{') +
      ' represents offical generators)\n  Install one?';
    }

    var resultsPrompt = [{
      name: '_installGenerator',
      type: 'list',
      message: introMessage,
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
  }.bind(this));
};


// Prompts user with a few helpful resources, then opens it in their browser.
yoyo.prototype._findHelp = function () {
  this.router.navigate('help');
};


// Serves as a quick escape from the `yo yo` prompts.
yoyo.prototype._exit = function () {
  this.insight.track('yoyo', 'exit');

  var url = 'https://github.com/yeoman/yeoman#team';
  var maxLength = url.length;
  var newLine = new Array(maxLength).join(' ');

  console.log(
    '\n' +
    yosay(
      'Bye from us! Chat soon.' +
      newLine +
      newLine +
      'The Yeoman Team ' + url,
      { maxLength: maxLength }
    )
  );
};


// I'm sorry...
yoyo.prototype._noop = function () {};


// Rolls through all of the generators provided by `env.generators`, finding
// their `package.json` files, then storing them internally in `this.pkgs`.
yoyo.prototype.findGenerators = function () {
  this.router.updateAvailableGenerators();
  this.pkgs = this.router.generators;
};


// Display the home `yo` screen, with the intial set of options.
//
// - options - (optional)
//           - message (string) - String to print before prompt.
//           - refresh (bool) - Spawn a new `yo` command.
yoyo.prototype.home = function (options) {
  var done = this.async();

  options = options || {};

  if (options.refresh) {
    this.env.lookup(function () {
      this.findGenerators();
      this.home({ message: options.message });
    }.bind(this));
    return;
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

  // Add menu entry if global config is present
  if (Object.keys(getGlobalConfig()).length > 0) {
    defaultChoices.splice(defaultChoices.length - 1, 0, {
      name: 'Clear global config',
      value: {
        method: '_clearGlobalConfig'
      }
    });
  }

  var generatorList = this._.chain(this.pkgs).map(function (generator) {
    if (!generator.appGenerator) {
      return;
    }

    var updateInfo = generator.updateAvailable ? chalk.dim.yellow(' ♥ Update Available!') : '';

    // TODO
    // var updateInfo = generator.updateAvailable ?
    //   chalk.dim.yellow(' ♥ Update Available!') +
    //   chalk.dim.reset(' (Press Space to update)') : '';

    return {
      name: generator.prettyName + updateInfo,
      value: {
        method: '_initGenerator',
        args: generator.namespace
      }
    };
  }).compact().sortBy(function (el) {
    var generatorName = namespaceToName(el.value.args);
    return -conf.get('generatorRunCount')[generatorName] || 0;
  }).value();

  if (generatorList.length) {
    defaultChoices.unshift({
      name: 'Update your generators',
      value: {
        method: '_promptToUpdateGenerators'
      }
    });
  }

  this.insight.track('yoyo', 'home');

  fullname(function (err, name) {
    if (err) {
      done(err);
      return;
    }

    var allo = name ? ('\'Allo ' + name.split(' ')[0] + '! ') : '\'Allo! ';

    this.prompt([{
      name: 'whatNext',
      type: 'list',
      message: allo + 'What would you like to do?',
      choices: this._.flatten([
        new gen.inquirer.Separator('Run a generator'),
        generatorList,
        new gen.inquirer.Separator(),
        defaultChoices,
        new gen.inquirer.Separator()
      ])
    }], function (answer) {
      this[answer.whatNext.method](answer.whatNext.args, done);
    }.bind(this));
  }.bind(this));
};

// Prompts the user to select which generators to clear
yoyo.prototype._clearGlobalConfig = function _clearGlobalConfig() {
  this.insight.track('yoyo', 'clearGlobalConfig');

  var defaultChoices = [
    {
      name: 'Take me back home, Yo!',
      value: {
        method: 'home'
      }
    }
  ];

  var generatorList = this._.chain(getGlobalConfig()).map(function (val, key) {
    var prettyName = '';
    var sort = 0;

    // Remove version from generator name
    var name = key.split(':')[0];
    var generator = this.pkgs[name];

    if (generator) {
      prettyName = generator.prettyName;
      sort = -conf.get('generatorRunCount')[namespaceToName(generator.namespace)] || 0;
    } else {
      prettyName = name.replace(/^generator-/, '') + chalk.red(' (not installed anymore)');
      sort = 0;
    }

    return {
      name: prettyName,
      sort: sort,
      value: {
        method: '_clearGeneratorConfig',
        args: {
          generator: key
        }
      }
    };
  }.bind(this)).compact().sortBy(function (generatorName) {
    return generatorName.sort;
  }).value();

  if (generatorList.length > 0) {
    generatorList.push(new gen.inquirer.Separator());
    defaultChoices.unshift({
      name: 'Clear all',
      value: {
        method: '_clearGeneratorConfig',
        args: {
          generator: '*'
        }
      }
    });
  }

  this.prompt([{
    name: 'whatNext',
    type: 'list',
    message: 'Which store would you like to clear?',
    choices: this._.flatten([
      generatorList,
      defaultChoices
    ])
  }], function (answer) {
    this[answer.whatNext.method](answer.whatNext.args);
  }.bind(this));
};

// Clear the given generator from the global config file
//
// - options
//           - generator (string) - Name of the generator to be clear. Use '*' to clear all generators.
yoyo.prototype._clearGeneratorConfig = function _clearGeneratorConfig(options) {
  var configContent;

  // Clear all
  if (options.generator === '*') {
    configContent = {};

  // Clear specifc generator by name
  } else if (this._.isString(options.generator)) {
    configContent = getGlobalConfig();
    delete configContent[options.generator];
  }

  if (configContent) {
    writeGlobalConfigFile(configContent);
      this.home({
        message: chalk.green('Global config has been successfully cleared')
    });
  }
};
