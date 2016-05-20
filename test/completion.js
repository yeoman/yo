'use strict';
var assert = require('assert');
var events = require('events');
var execFile = require('child_process').execFile;
var Completer = require('../lib/completion/completer');
var completion = require('../lib/completion');
var find = require('lodash').find;

describe('Completion', function () {

  before(function () {
    this.env = require('yeoman-environment').createEnv();
  });

  describe('Test completion STDOUT output', function () {
    it('Returns the completion candidates for both options and installed generators', function (done) {
      var cmd = 'DEBUG="tabtab*" SHELL=zsh COMP_POINT="4" COMP_LINE="yo" COMP_CWORD="yo" ';
      cmd += 'node lib/completion/index.js completion -- yo';

      console.log('cmd', cmd);
      execFile('bash', ['-c', cmd], function (err, out) {
        if (err) {
          return done(err);
        }

        console.log('out:', out);
        assert.ok(/-f/.test(out));
        assert.ok(/--force/.test(out));
        assert.ok(/--version/.test(out));
        assert.ok(/--no-color/.test(out));
        assert.ok(/--no-insight/.test(out));
        assert.ok(/--insight/.test(out));
        assert.ok(/--generators/.test(out));

        done();
      });
    });
  });

  describe('Completion', function () {
    it('Creates tabtab instance', function () {
      assert.ok(completion instanceof events.EventEmitter);
    });
  });

  describe('Completer', function () {
    beforeEach(function () {
      // Mock / Monkey patch env.getGeneratorsMeta() here, since we pass the
      // instance directly to completer.
      this.getGeneratorsMeta = this.env.getGeneratorsMeta;

      this.env.getGeneratorsMeta = function () {
        return {
          'dummy:app': {
            resolved: '/home/user/.nvm/versions/node/v6.1.0/lib/node_modules/generator-dummy/app/index.js',
            namespace: 'dummy:app'
          },
          'dummy:yo': {
            resolved: '/home/user/.nvm/versions/node/v6.1.0/lib/node_modules/generator-dummy/yo/index.js',
            namespace: 'dummy:yo'
          }
        };
      };

      this.completer = new Completer(this.env);
    });

    afterEach(function () {
      this.env.getGeneratorsMeta = this.getGeneratorsMeta;
    });

    describe('#item', function () {
      it('Format results into { name, description }', function () {
        var list = ['foo', 'bar'];
        var results = list.map(this.completer.item('yo!', '--'));
        assert.deepEqual(results, [{
          name: '--foo',
          description: 'yo!'
        }, {
          name: '--bar',
          description: 'yo!'
        }]);
      });

      it('Escapes certain characters before consumption by shell scripts', function () {
        var list = ['foo'];

        var desc = '#  yo I\'m a very subtle description, with chars that likely will break your Shell: yeah I\'m mean';
        var expected = 'yo I m a very subtle description, with chars that likely will break your Shell-> yeah I m mean';
        var results = list.map(this.completer.item(desc, '-'));

        assert.equal(results[0].description, expected);
      });
    });

    describe('#complete', function () {
      it('Returns the list of user installed generators as completion candidates', function (done) {
        this.completer.complete({ last: 'yo' }, function (err, results) {
          if (err) {
            return done(err);
          }

          var dummy = find(results, function (result) {
            return result.name === 'dummy:yo';
          });

          assert.equal(dummy.name, 'dummy:yo');
          assert.equal(dummy.description, 'yo from dummy generator');

          done();
        });
      });
    });
  });

});
