import path from 'node:path';
import {execFile} from 'node:child_process';
import parseHelp from 'parse-help';
import {getDirname} from '../utils/node-shims.js';

/**
 * The Completer is in charge of handling `yo-complete` behavior.
 * @constructor
 * @param  {Environment} env A yeoman environment instance
 */
class Completer {
  constructor(env) {
    this.env = env;
  }

  /**
   * Completion event done
   *
   * @param {String}   data   Environment object as parsed by tabtab
   * @param {Function} done   Callback to invoke with completion results
   */
  complete(data, done) {
    if (data.last !== 'yo' && !data.last.startsWith('-')) {
      return this.generator(data, done);
    }

    this.env.lookup().catch(done).then(() => {
      const meta = this.env.getGeneratorsMeta();
      const results = Object.keys(meta).map(this.item('yo'), this);
      done(null, results);
    });
  }

  /**
   * Generator completion event done
   *
   * @param {String}   data   Environment object as parsed by tabtab
   * @param {Function} done   Callback to invoke with completion results
   */
  generator(data, done) {
    const {last} = data;
    const binary = path.resolve(getDirname(import.meta.url), '../cli.js');

    execFile('node', [binary, last, '--help'], (error, out) => {
      if (error) {
        done(error);
        return;
      }

      const results = this.parseHelp(last, out);
      done(null, results);
    });
  }

  /**
   * Helper to format completion results into { name, description } objects
   *
   * @param {String}   data   Environment object as parsed by tabtab
   * @param {Function} done   Callback to invoke with completion results
   */
  item(desc, prefix = '') {
    return item => {
      const name = typeof item === 'string' ? item : item.name;
      desc = typeof item !== 'string' && item.description ? item.description : desc;
      desc = desc.replaceAll(/^#?\s*/g, '');
      desc = desc.replaceAll(':', '->');
      desc = desc.replaceAll('\'', ' ');

      return {
        name: prefix + name,
        description: desc,
      };
    };
  }

  /**
   * Parse-help wrapper. Invokes parse-help with stdout result, returning the
   * list of completion items for flags / alias.
   *
   * @param {String}   last  Last word in COMP_LINE (completed line in command line)
   * @param {String}   out   Help output
   */
  parseHelp(last, out) {
    const help = parseHelp(out);
    const alias = [];

    let results = Object.keys(help.flags).map(key => {
      const flag = help.flags[key];

      if (flag.alias) {
        alias.push({...flag, name: flag.alias});
      }

      flag.name = key;

      return flag;
    }).map(this.item(last, '--'), this);

    results = [...results, ...alias.map(this.item(last.replace(':', '_'), '-'), this)];
    results = results.filter(r => r.name !== '--help' && r.name !== '-h');

    return results;
  }
}

export default Completer;
