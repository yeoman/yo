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
  var router = new Router(generator.env, generator.insight, conf);
  router.insight.track('yoyo', 'init');
  router.registerRoute('help', require('./lib/routes/help'));
  router.registerRoute('update', require('./lib/routes/update'));
  router.registerRoute('run', require('./lib/routes/run'));
  router.registerRoute('install', require('./lib/routes/install'));
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
// - name - (string) The generator to initialize.
yoyo.prototype._initGenerator = function (name, done) {
  this.router.navigate('run', name);
};


// Serves as the response prompt for "Install a generator" as well as simply
// installs a generator if a string is passed in.
//
// - pkgName - (optional) A string that matches the NPM package name.
yoyo.prototype._installGenerator = function (pkgName) {
  return this.router.navigate('install');
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
  this.pkgs = this.router.generators;

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
