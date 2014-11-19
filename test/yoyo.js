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

      // Skipping this one because we don't actually install a generator, so this one
      // was just relying on side effects from another test.
      it.skip('should display installed generators', function () {
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
});
