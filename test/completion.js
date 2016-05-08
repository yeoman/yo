'use strict';

var path = require('path');
var assert = require('assert');
var events = require('events');
var execFile = require('child_process').execFile;
var Completer = require('../lib/completion/completer');
var completion = require('../lib/completion');
var find = require('lodash').find;

var help = [
  '  Usage:',
  '  yo backbone:app [options] [<app_name>]',
  '',
  '  Options:',
  '    -h,   --help                # Print the generator\'s options and usage',
  '          --skip-cache          # Do not remember prompt answers                         Default: false',
  '          --skip-install        # Do not automatically install dependencies              Default: false',
  '          --appPath             # Name of application directory                          Default: app',
  '          --requirejs           # Support requirejs                                      Default: false',
  '          --template-framework  # Choose template framework. lodash/handlebars/mustache  Default: lodash',
  '          --test-framework      # Choose test framework. mocha/jasmine                   Default: mocha',
  '',
  '  Arguments:',
  '    app_name    Type: String  Required: false'
].join('\n');

describe('Completion', function () {

  before(function () {
    this.env = require('yeoman-environment').createEnv();
  });

  describe('Test completion STDOUT output', function () {
    it('Returns the completion candidates for both options and installed generators', function (done) {
      var yocomplete = path.join(__dirname, '../lib/completion/index.js');
      var yo = path.join(__dirname, '../lib/cli');

      var cmd = 'export cmd=\"yo\" && DEBUG=\"tabtab*\" COMP_POINT=\"4\" COMP_LINE=\"$cmd\" COMP_CWORD=\"$cmd\"';
      cmd += 'node ' + yocomplete + ' completion -- ' + yo + ' $cmd';

      execFile('bash', ['-c', cmd], function (err, out) {
        if (err) {
          return done(err);
        }

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

      this.env.getGeneratorsMeta =  function () {
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

    describe('#parseHelp', function () {
      it('Returns completion items based on help output', function () {
        var results = this.completer.parseHelp('backbone:app', help);
        var first = results[0];

        assert.equal(results.length, 6);
        assert.deepEqual(first, {
          name: '--skip-cache',
          description: 'Do not remember prompt answers                         Default-> false'
        });
      });
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

    describe('#generator', function () {
      it('Returns completion candidates from generator help output', function (done) {
        // Here we test against yo --help (could use dummy:yo --help)
        this.completer.complete({ last: '' }, function (err, results) {
          if (err) {
            return done(err);
          }

          /* eslint no-multi-spaces: 0 */
          assert.deepEqual(results, [
            { name: '--force',    description: 'Overwrite files that already exist' },
            { name: '--version',  description: 'Print version' },
            { name: '--no-color', description: 'Disable colors' },
            { name: '-f',         description: 'Overwrite files that already exist' }
          ]);

          done();
        });
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
          assert.equal(dummy.description, 'yo');

          done();
        });
      });
    });
  });

});
