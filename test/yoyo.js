var path = require('path');
var util = require('util');
var generator = require('yeoman-generator');
var helpers = require(path.join(path.dirname(require.resolve('yeoman-generator')), 'lib/test/helpers'));
var assert = require('assert');
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
env.register(path.join(__dirname, '../yoyo'), 'yo');

function Phoenix() {
  generator.Base.apply(this, arguments);
}
util.inherits(Phoenix, generator.Base);
env.registerStub(Phoenix, 'phoenix:app');

describe('yo yo', function () {
  afterEach(helpers.restore);

  it('should find generators', function (cb) {
    helpers.stub(yoyo.prototype, 'findGenerators', cb);

    yo();
  });

  it('should send the user to the home screen', function (cb) {
    helpers.stub(yoyo.prototype, 'home', cb);

    yo();
  });

  describe('home', function () {
    describe('prompts', function () {
      var choices = {
        generators: [],
        methods: []
      };

      before(function () {
        yoyo.prototype.pkgs = {
          phoenix: {
            version: '0.0.0',
            appGenerator: true,
            namespace: 'phoenix:app'
          }
        };
        helpers.stub(yoyo.prototype, 'findGenerators');
        helpers.stub(yoyo.prototype, 'prompt', function (prompts) {
          prompts[0].choices.forEach(function (choice) {
            if (choice.value && choice.value.method) {
              if (choice.value.method === '_initGenerator') {
                choices.generators.push(choice.value.args);
              } else {
                choices.methods.push(choice.value.method);
              }
            }
          });
        });

        yo();
      });

      it('should display installed generators', function () {
        assert.equal(choices.generators.length, 1);
        assert.ok(choices.generators.indexOf('phoenix:app') > -1);
      });

      it('should allow an option to exit', function () {
        assert.ok(choices.methods.indexOf('_noop') > -1);
      });
    });
  });

  describe('updateGenerators', function () {
    var pkgs = yoyo.prototype.pkgs;
    var updatedGenerators = [];
    var sentHome = false;

    beforeEach(function () {
      yoyo.prototype.pkgs = [{
        name: 'generator-unicorn'
      }, {
        name: 'generator-phoenix'
      }];

      yoyo.prototype.insight = insightStub;

      helpers.stub(yoyo.prototype, 'spawnCommand', function spawnCommand(cmd, args) {
        if (args) {
          updatedGenerators.push(args[args.length - 1]);
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

      helpers.stub(yoyo.prototype, 'home', function (opts) {
        sentHome = true;
      });

      yoyo.prototype._updateGenerators();
    });

    after(function () {
      yoyo.prototype.pkgs = pkgs;
    });

    it('should globally update installed generators', function () {
      assert.ok(updatedGenerators.indexOf('generator-unicorn') > -1);
      assert.ok(updatedGenerators.indexOf('generator-phoenix') > -1);
    });

    it('should return the user to the home screen', function () {
      assert.ok(sentHome);
    });
  });

  describe('initGenerator', function () {
    it('should .run() desired generator', function (done) {
      var fakeGenerator = 'generator-phoenix';

      helpers.stub(yoyo.prototype.env = {}, 'run', function (generator, done) {
        assert.equal(generator, fakeGenerator);
        done();
      });

      yoyo.prototype._initGenerator(fakeGenerator, done);
    });
  });

  describe('installGenerator', function () {
    describe('argument supplied', function () {
      var installedGenerator;
      var fakeGenerator = 'generator-phoenix';
      var options;

      before(function () {
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

    var fakeResponse = {
      rows: [{
        key: [ null, 'generator-unicorn' ]
      }, {
        key: [ null, 'generator-phoenix' ]
      }, {
        key: [ null, 'generator-unicorn-sparkles' ]
      }]
    };

    beforeEach(function () {
      // Pretend we have generator-unicorn installed. I mean, why wouldn't we?
      yoyo.prototype.pkgs = { 'generator-unicorn': 'awesome' };

      yoyo.prototype.npmGenerators = fakeResponse;

      helpers.stub(yoyo.prototype, 'prompt', function (prompts, cb) {
        choices = [];
        prompts[0].choices.forEach(function (choice) {
          choices.push(choice.value);
        });
      });
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
        searchTerm: 'unicorn'
      });

      assert.ok(called);
      yoyo.prototype.npmGenerators = npmGenerators;
    });

    it('should prompt user with generators that match the term', function () {
      yoyo.prototype._searchNpm({
        searchTerm: 'generator'
      });

      assert.ok(choices.indexOf('generator-phoenix') > -1);
      assert.ok(choices.indexOf('generator-unicorn-sparkles') > -1);
    });

    it('should not show already installed generators', function () {
      yoyo.prototype._searchNpm({
        searchTerm: 'unicorn'
      });

      assert.ok(choices.indexOf('generator-unicorn') === -1);
      assert.ok(choices.indexOf('generator-unicorn-sparkles') > -1);
    });

    it('should allow the user to search again', function () {
      yoyo.prototype._searchNpm({
        searchTerm: 'unicorn'
      });

      assert.ok(choices.indexOf('_installGenerator') > -1);
    });

    it('should allow the user to return home', function () {
      yoyo.prototype._searchNpm({
        searchTerm: 'unicorn'
      });

      assert.ok(choices.indexOf('home') > -1);
    });
  });

  describe('findHelp', function () {
    var choices;

    before(function () {
      helpers.stub(yoyo.prototype, 'prompt', function (prompts, callback) {
        choices = prompts[0].choices;
      });

      yoyo.prototype._findHelp();
    });

    it('should only allow URLs and existing methods', function () {
      choices.forEach(function (choice) {
        if (choice.value.method) {
          assert.ok(yoyo.prototype._.isFunction(yoyo.prototype[choice.value.method]));
        } else {
          assert.ok(choice.value.match(/^https*:\/\//));
        }
      });
    });
  });
});
