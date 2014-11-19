/*global describe, it, before, beforeEach, after, afterEach */
'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var util = require('util');
var sinon = require('sinon');
var generator = require('yeoman-generator');
var helpers = generator.test;
var env = generator();

var insightStub = {
  track: function () {}
};

var yoyo = require('../yoyo');
var yo = function () {
  env.run('yo', {
    insight: insightStub
  });
};
env.registerStub(yoyo, 'yo');

var Phoenix = generator.Base.extend();
env.registerStub(Phoenix, 'phoenix:app');

describe('yo yo', function () {
  afterEach(helpers.restore);

  it.skip('should find generators', function (cb) {
    helpers.stub(yoyo.prototype, 'findGenerators', cb);

    yo();
  });

  it.skip('should send the user to the home screen', function (cb) {
    helpers.stub(yoyo.prototype, 'home', cb);

    yo();
  });

  describe('home', function () {
    describe('prompts', function () {
      var choices = {
        generators: [],
        methods: []
      };

      before(function (cb) {
        yoyo.prototype.pkgs = {
          phoenix: {
            version: '0.0.0',
            appGenerator: true,
            namespace: 'phoenix:app'
          }
        };
        this.stubFindGenerators = sinon.stub(yoyo.prototype, 'findGenerators');
        this.stubPrompt = sinon.stub(yoyo.prototype, 'prompt', function (prompts) {
          prompts[0].choices.forEach(function (choice) {
            if (choice.value && choice.value.method) {
              if (choice.value.method === '_initGenerator') {
                choices.generators.push(choice.value.args);
              } else {
                choices.methods.push(choice.value.method);
              }
            }
          });
          cb();
        });

        this.stubExistsSync = sinon.stub(fs, 'existsSync').returns(false);

        yo();
      });

      afterEach(function() {
        this.stubPrompt.restore();
        this.stubExistsSync.restore();
        this.stubFindGenerators.restore();
      });

      it('should display installed generators', function () {
        assert.equal(choices.generators.length, 1);
        assert.ok(choices.generators.indexOf('phoenix:app') > -1);
      });

      it('should allow an option to exit', function () {
        assert.ok(choices.methods.indexOf('_noop') > -1);
      });

      it('should not display clear menu', function () {
        assert.ok(choices.methods.indexOf('_clearGlobalConfig') === -1);
      });
    });
  });

  describe('installGenerator', function () {
    describe('argument supplied', function () {
      var installedGenerator;
      var fakeGenerator = 'generator-phoenix';
      var options;

      before(function () {
        yoyo.prototype.insight = insightStub;
        helpers.stub(yoyo.prototype, 'home', function (opts) {
          options = opts;
        });

        helpers.stub(yoyo.prototype, 'spawnCommand', function spawnCommand(cmd, args) {
          if (args) {
            installedGenerator = args[args.length - 1];
          }

          return {
            on: function (event, cb) {
              if (event === 'exit') {
                return cb();
              } else {
                return spawnCommand();
              }
            }
          };
        });

        yoyo.prototype._installGenerator(fakeGenerator);
      });

      it('should install a generator', function () {
        assert.equal(installedGenerator, fakeGenerator);
      });

      it('should send the user home with `refresh: true`', function () {
        assert.equal(options.refresh, true);
      });
    });

    describe('no argument supplied', function () {
      var prompted = false;
      var searchNpmCalled = false;

      before(function () {
        helpers.stub(yoyo.prototype, 'home');

        helpers.stub(yoyo.prototype, '_searchNpm', function () {
          searchNpmCalled = true;
        });

        helpers.stub(yoyo.prototype, 'prompt', function (prompts, callback) {
          prompted = true;
          callback();
        });

        yoyo.prototype._installGenerator();
      });

      it('should prompt for a search term if argument wasn\'t supplied', function () {
        assert.ok(prompted);
      });

      it('should search npm with the search term', function () {
        assert.ok(searchNpmCalled);
      });
    });
  });

  describe('findAllNpmGenerators', function () {
    var requestedUrl;
    var npmGeneratorsExpected = {
      'generator-phoenix': {
        adorable: true
      }
    };
    var searchTermExpected = 'phoenix';
    var searchTermActual;

    before(function () {
      helpers.stub(yoyo.prototype, 'request', function (url, cb) {
        requestedUrl = url;
        cb(null, null, JSON.stringify(npmGeneratorsExpected));
      });

      yo();
      yoyo.prototype._findAllNpmGenerators(searchTermExpected, function (term) {
        searchTermActual = term;
      });
    });

    it('should make request for the registry', function () {
      assert.ok(requestedUrl.indexOf('isaacs.iriscouch.com') > -1);
    });

    it('should parse and store the response as JSON', function () {
      assert.equal(JSON.stringify(yoyo.prototype.npmGenerators), JSON.stringify(npmGeneratorsExpected));
    });

    it('should return searched term to callback', function () {
      assert.equal(searchTermActual, searchTermExpected);
    });
  });

  describe('searchNpm', function () {
    var pkgs = yoyo.prototype.pkgs;
    var npmGenerators = yoyo.prototype.npmGenerators;

    var choices = [];

    var fakeResponse ={
  'rows': [
    {
        'key': [
          'yeoman-generator',
          'generator-amd',
          'A generator for Yeoman that provides a boilerplate for a single AMD module'
        ],
        'value': 1
      },
      {
        'key': [
          'yeoman-generator',
          'generator-amd-build',
          'Yeoman generator to build Amd app with the grunt-amd-build Grunt plugin.'
        ],
        'value': 1
      },
      {
        'key': [
          'yeoman-generator',
          'generator-amdblah',
          'Generator for starting a project with Express, RequireJS, Backbone.js + Handlebars both on server and client side, i18next, Moment.js and Bootstrap.'
        ],
        'value': 1
      }
    ]
  };

    beforeEach(function () {
      // Pretend we have generator-amd-build installed. I mean, why wouldn't we?
      yoyo.prototype.pkgs = { 'generator-amd-build': 'awesome' };

      yoyo.prototype.npmGenerators = fakeResponse;

    });

    after(function () {
      yoyo.prototype.npmGenerators = npmGenerators;
      yoyo.prototype.pkgs = pkgs;
    });

    it('should call `_findAllNpmGenerators` if it hasn\'t before', function () {
      var npmGenerators = yoyo.prototype.npmGenerators;
      yoyo.prototype.npmGenerators = null;

      var called = false;
      helpers.stub(yoyo.prototype, '_findAllNpmGenerators', function () {
        called = true;
      });

      yoyo.prototype._searchNpm({
        searchTerm: 'amd'
      });

      assert.ok(called);
      yoyo.prototype.npmGenerators = npmGenerators;
    });

    it('should prompt user with generators that match the term', function (done) {
      helpers.stub(yoyo.prototype, 'prompt', function (prompts, cb) {
       var choices = prompts[0].choices.map(function (choice) {
        return choice.value;
       });
       assert.ok(choices.indexOf('generator-amd') > -1);
       assert.ok(choices.indexOf('generator-amdblah') > -1);
       done();
      });
      yoyo.prototype._searchNpm({
        searchTerm: 'a'
      });
    });

    it('should not show already installed generators', function (done) {
      helpers.stub(yoyo.prototype, 'prompt', function (prompts, cb) {
       var choices = prompts[0].choices.map(function (choice) {
        return choice.value;
       });
       assert.ok(choices.indexOf('generator-amd-build') === -1);
       assert.ok(choices.indexOf('generator-amd') > -1);
       done();
      });
      yoyo.prototype._searchNpm({
        searchTerm: 'amd'
      });
    });

    it('should allow the user to search again', function (done) {
      helpers.stub(yoyo.prototype, 'prompt', function (prompts, cb) {
       var choices = prompts[0].choices.map(function (choice) {
        return choice.value;
       });
       assert.ok(choices.indexOf('_installGenerator') > -1);
       done();
      });
      yoyo.prototype._searchNpm({
        searchTerm: 'amd'
      });
    });

    it('should allow the user to return home', function (done) {
      helpers.stub(yoyo.prototype, 'prompt', function (prompts, cb) {
       var choices = prompts[0].choices.map(function (choice) {
        return choice.value;
       });
       assert.ok(choices.indexOf('home') > -1);
       done();
      });
      yoyo.prototype._searchNpm({
        searchTerm: 'amd'
      });
    });
  });

  describe('clearGlobalConfig', function () {

    it('should display only generators with a global store entry', function () {
      var choices = {
        generators: [],
        prettyNames: []
      };

      yoyo.prototype.pkgs = {
        'generator-unicorn': {
          name: 'generator-unicorn',
          prettyName: 'Unicorn',
          namespace: 'unicorn:app'
        },
        'generator-foo': {
          name: 'generator-foo',
          prettyName: 'Foo',
          namespace: 'foo:app'
        }
      };

      var stubExistsSync = sinon.stub(fs, 'existsSync').returns(true);

      var stubReadFileSync = sinon.stub(fs, 'readFileSync', function () {
        return JSON.stringify({
          'generator-phoenix': {},
          'generator-unicorn': {}
        });
      });

      var stubPrompt = sinon.stub(yoyo.prototype, 'prompt', function (prompts) {
        prompts[0].choices.forEach(function (choice) {
          if (choice.name) {
            choices.prettyNames.push(choice.name);
          }
          if (choice.value && choice.value.args && choice.value.args.generator) {
            choices.generators.push(choice.value.args.generator);
          }
        });
      });

      yoyo.prototype._clearGlobalConfig();

      assert.equal(choices.generators.length, 3);
      assert.ok(choices.generators.indexOf('*') > -1); // Clear all generators entry is present
      assert.ok(choices.generators.indexOf('generator-phoenix') > -1);
      assert.ok(choices.generators.indexOf('generator-unicorn') > -1);

      assert.ok(choices.prettyNames.indexOf('Unicorn') > -1);
      assert.ok(choices.prettyNames.indexOf('phoenix\u001b[31m (not installed anymore)\u001b[39m') > -1);

      stubExistsSync.restore();
      stubReadFileSync.restore();
      stubPrompt.restore();
    });
  });
});
