var fs = require('fs');
var async = require('async');
var open = require('open');
var generator = require('yeoman-generator');
var util = require('util');
var path = require('path');


// The `yo yo` generator provides users with a few common, helpful commands.
var yoyo = function yoyo() {
  generator.Base.apply(this, arguments);

  // Find the installed generators and their respective package.json files.
  this._findGenerators();

  // Start this party.
  this.home();
};

util.inherits(yoyo, generator.Base);


// Rolls through all of the generators provided by `env.generators`, finding
// their `package.json` files, then storing them internally in `this.pkgs`.
yoyo.prototype._findGenerators = function findGenerators() {
  var self = this;
  self.pkgs = {};

  // This should be a Set with ES6.
  var resolvedGenerators = {};
  var resolveGenerators = function (generator) {
    var generatorPath = generator.resolved.replace(/(\/.*generator[^\/]*)\/.*/, '$1/package.json');

    return function (next) {
      var alreadyResolved = generatorPath in resolvedGenerators;
      var isPackageJSON = path.basename(generatorPath) === 'package.json';

      if (alreadyResolved || !isPackageJSON || !fs.existsSync(generatorPath)) {
        return next();
      }

      var pkg = JSON.parse(self.readFileAsString(generatorPath));
      self.pkgs[pkg.name] = pkg;

      resolvedGenerators[generatorPath] = true;
    };
  };

  async.parallel(self._.map(self.env.generators, resolveGenerators), function (err) {
    if (err) {
      return self.emit('error', err);
    }
  });
};


// Display the home `yo` screen, with the intial set of options.
//
// - options - (optional)
//           - message (string) - String to print before prompt.
//           - refresh (bool) - Spawn a new `yo` command.
yoyo.prototype.home = function home(options) {
  options = options || {};

  if (options.refresh) {
    return this.spawnCommand('yo');
  }

  if (options.message) {
    console.log('\n' + options.message.cyan + '\n');
  }

  var defaultChoices = [{
    name: 'Install a generator',
    value: {
      method: 'installGenerator'
    }
  }, {
    name: 'Find some help',
    value: {
      method: 'findHelp'
    }
  }, {
    name: 'Get me out of here!',
    value: {
      method: 'exit'
    }
  }];

  var generatorList = this._.chain(this.env.generators).map(function (generator) {
    var namespace = generator.namespace;
    var prettyName;

    if (namespace.substr(-4) === ':app') {
      prettyName = namespace.replace(':app', '');
      prettyName = prettyName.charAt(0).toUpperCase() + prettyName.slice(1);
      return {
        name: 'Run the ' + prettyName + ' generator',
        value: {
          method: 'initGenerator',
          args: namespace
        }
      };
    }
  }).compact().value();

  if (generatorList.length) {
    defaultChoices.unshift({
      name: 'Update your generators',
      value: {
        method: 'updateGenerators'
      }
    });
  }

  this.prompt([{
    name: 'whatNext',
    type: 'list',
    message: 'What would you like to do?',
    choices: this._.union(generatorList, defaultChoices)
  }], function (answer) {
    this[answer.whatNext.method](answer.whatNext.args);
  }.bind(this));
};


// Runs parallel `npm update -g`s for each detected generator.
yoyo.prototype.updateGenerators = function updateGenerators() {
  var self = this;

  var resolveGenerators = function (pkg) {
    return function (next) {
      self.spawnCommand('npm', ['update', '-g', pkg.name])
        .on('error', next)
        .on('exit', next);
    };
  };

  async.parallel(self._.map(self.pkgs, resolveGenerators), function (err) {
    if (err) {
      return self.emit('error', err);
    }

    self.home({
      message: 'You\'re all set! Is there anything else I can get you?'
    });
  });
};


// Initializes a generator.
//
// - generator - (string) The generator to initialize.
yoyo.prototype.initGenerator = function initGenerator(generator) {
  console.log((
    '\nBefore you create a new application, be sure you are running this command'
    + '\nfrom the directory you wish your application to be dropped into.'
    + '\n'
  ).yellow);

  this.spawnCommand('yo', [generator]);
};


// Serves as the response prompt for "Install a generator" as well as simply
// installs a generator if a string is passed in.
//
// - pkgName - (optional) A string that matches the NPM package name.
yoyo.prototype.installGenerator = function installGenerator(pkgName) {
  if (this._.isString(pkgName)) {
    // We know what generator we want to install
    return this.spawnCommand('npm', ['install', '-g', pkgName])
      .on('error', function (err) {
        this.emit('error', err);
      }.bind(this))
      .on('exit', function () {
        this.home({
          refresh: true
        });
      }.bind(this));
  }

  this.prompt([{
    name: 'searchTerm',
    message: 'Search NPM for generators'
  }], this.searchNpm.bind(this));
};


// Grabs all of the packages with a `yeoman-generator` keyword on NPM.
//
// - term - (object) Contains the search term & gets passed back to callback().
// - cb   - Callback to execute once generators have been found.
yoyo.prototype._findAllNpmGenerators = function findAllNpmGenerators(term, cb) {
  var url = 'http://isaacs.iriscouch.com/registry/_design/app/_view/byKeyword?startkey=[%22yeoman-generator%22]&endkey=[%22yeoman-generator%22,{}]&group_level=3';

  this.request(url, function (err, res, body) {
    if (err) {
      return this.emit('error', err);
    }

    this.npmGenerators = JSON.parse(body);
    cb(term);
  }.bind(this));
};


// Takes a search term, looks it up in the registry, prompts the user with the
// results, allowing them to choose to install it, or go back home.
//
// - term - Object with a 'searchTerm' property containing the term to search
//          NPM for.
yoyo.prototype.searchNpm = function searchNpm(term) {
  if (!this.npmGenerators) {
    return this._findAllNpmGenerators(term, this.searchNpm.bind(this));
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
    name: 'installGenerator',
    type: 'list',
    message: choices.length > 0 ? 'Here\'s what I found. Install one?' : 'Sorry, nothing was found',
    choices: this._.union(choices, {
      name: 'Search again',
      value: 'installGenerator'
    }, {
      name: 'Return home',
      value: 'home'
    })
  }];

  this.prompt(resultsPrompt, function (answer) {
    if (this._.isFunction(this[answer.installGenerator])) {
      return this[answer.installGenerator]();
    }

    this.installGenerator(answer.installGenerator);
  }.bind(this));
};


// Prompts user with a few helpful resources, then opens it in their browser.
yoyo.prototype.findHelp = function findHelp() {
  this.prompt([{
    name: 'whereTo',
    type: 'list',
    message: 'Here are a few helpful resources.'
      + '\n\nI will open the link you select in your browser for you',
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
    if (this._.isFunction(this[answer.whereTo.method])) {
      return this[answer.whereTo.method](answer.whereTo.args);
    }

    open(answer.whereTo);
  }.bind(this));
};


// Serves as a quick escape from the `yo yo` prompts.
yoyo.prototype.exit = function exit() {
  console.log(
      '\nBye from us! Chat soon.'
    + '\n'
    + '\n            Add' + 'y'.red.bold + ' Osmani'
    + '\n          Sindr' + 'e'.red.bold + ' Sorhus'
    + '\n        Brian F' + 'o'.red.bold + 'rd'
    + '\n     Eric Bidel' + 'm'.red.bold + 'an'
    + '\n              P' + 'a'.red.bold + 'ul Irish'
    + '\n     Mickael Da' + 'n'.red.bold + 'iel'
    + '\n          Pasca' + '1'.yellow.bold + ' Hartig'
    + '\n      Stephen S' + '.'.cyan.bold + 'wchuk'
    + '\n    Frederick R' + '0'.yellow.bold + 's'
    + '\n');
};


module.exports = function (env) {
  env.register(yoyo, 'yo').create('yo');
};
