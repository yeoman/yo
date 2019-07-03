'use strict';
const path = require('path');
const assert = require('assert');
const events = require('events');
const {execFile} = require('child_process');
const {find} = require('lodash');
const Completer = require('../lib/completion/completer');
const completion = require('../lib/completion');

const help = `
  Usage:
  yo backbone:app [options] [<app_name>]

  Options:
    -h,   --help                # Print the generator's options and usage
          --skip-cache          # Do not remember prompt answers                         Default: false
          --skip-install        # Do not automatically install dependencies              Default: false
          --appPath             # Name of application directory                          Default: app
          --requirejs           # Support requirejs                                      Default: false
          --template-framework  # Choose template framework. lodash/handlebars/mustache  Default: lodash
          --test-framework      # Choose test framework. mocha/jasmine                   Default: mocha

  Arguments:
    app_name    Type: String  Required: false`;

describe('Completion', () => {
  before(function () {
    this.env = require('yeoman-environment').createEnv();
  });

  describe('Test completion STDOUT output', () => {
    it('Returns the completion candidates for both options and installed generators', done => {
      const yocomplete = path.join(__dirname, '../lib/completion/index.js');
      const yo = path.join(__dirname, '../lib/cli');

      let cmd = 'export cmd="yo" && YO_TEST=true DEBUG="tabtab*" COMP_POINT="4" COMP_LINE="$cmd" COMP_CWORD="$cmd"';
      cmd += `node ${yocomplete} completion -- ${yo} $cmd`;

      execFile('bash', ['-c', cmd], (err, out) => {
        if (err) {
          done(err);
          return;
        }

        assert.ok(/-f/.test(out));
        assert.ok(/--force/.test(out));
        assert.ok(/--version/.test(out));
        assert.ok(/--no-color/.test(out));
        assert.ok(/--no-insight/.test(out));
        assert.ok(/--insight/.test(out));
        assert.ok(/--generators/.test(out));
        assert.ok(/--local-only/.test(out));

        done();
      });
    });
  });

  describe('Completion', () => {
    it('Creates tabtab instance', () => {
      assert.ok(completion instanceof events);
    });
  });

  describe('Completer', () => {
    beforeEach(function () {
      // Mock / Monkey patch env.getGeneratorsMeta() here, since we pass the
      // instance directly to completer.
      this.getGeneratorsMeta = this.env.getGeneratorsMeta;

      this.env.getGeneratorsMeta = () => ({
        'dummy:app': {
          resolved: '/home/user/.nvm/versions/node/v6.1.0/lib/node_modules/generator-dummy/app/index.js',
          namespace: 'dummy:app'
        },
        'dummy:yo': {
          resolved: '/home/user/.nvm/versions/node/v6.1.0/lib/node_modules/generator-dummy/yo/index.js',
          namespace: 'dummy:yo'
        }
      });

      this.completer = new Completer(this.env);
    });

    afterEach(function () {
      this.env.getGeneratorsMeta = this.getGeneratorsMeta;
    });

    describe('#parseHelp', () => {
      it('Returns completion items based on help output', function () {
        const results = this.completer.parseHelp('backbone:app', help);
        const first = results[0];

        assert.strictEqual(results.length, 6);
        assert.deepStrictEqual(first, {
          name: '--skip-cache',
          description: 'Do not remember prompt answers                         Default-> false'
        });
      });
    });

    describe('#item', () => {
      it('Format results into { name, description }', function () {
        const list = ['foo', 'bar'];
        const results = list.map(this.completer.item('yo!', '--'));
        assert.deepStrictEqual(results, [{
          name: '--foo',
          description: 'yo!'
        }, {
          name: '--bar',
          description: 'yo!'
        }]);
      });

      it('Escapes certain characters before consumption by shell scripts', function () {
        const list = ['foo'];

        const desc = '#  yo I\'m a very subtle description, with chars that likely will break your Shell: yeah I\'m mean';
        const expected = 'yo I m a very subtle description, with chars that likely will break your Shell-> yeah I m mean';
        const results = list.map(this.completer.item(desc, '-'));

        assert.strictEqual(results[0].description, expected);
      });
    });

    describe('#generator', () => {
      it('Returns completion candidates from generator help output', function (done) {
        // Here we test against yo --help (could use dummy:yo --help)
        this.completer.complete({last: ''}, (err, results) => {
          if (err) {
            done(err);
            return;
          }

          /* eslint no-multi-spaces: 0 */
          assert.deepStrictEqual(results, [
            {name: '--force',      description: 'Overwrite files that already exist'},
            {name: '--version',    description: 'Print version'},
            {name: '--no-color',   description: 'Disable colors'},
            {name: '--generators', description: 'Print available generators'},
            {name: '--local-only', description: 'Disable lookup of globally-installed generators'},
            {name: '-f',           description: 'Overwrite files that already exist'}
          ]);

          done();
        });
      });
    });

    describe('#complete', () => {
      it('Returns the list of user installed generators as completion candidates', function (done) {
        this.completer.complete({last: 'yo'}, (err, results) => {
          if (err) {
            done(err);
            return;
          }

          const dummy = find(results, result => result.name === 'dummy:yo');
          assert.strictEqual(dummy.name, 'dummy:yo');
          assert.strictEqual(dummy.description, 'yo');

          done();
        });
      });
    });
  });
});
