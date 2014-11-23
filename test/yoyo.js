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
