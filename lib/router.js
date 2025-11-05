import path from 'node:path';
import titleize from 'titleize';
import humanizeString from 'humanize-string';
import {readPackageUpSync} from 'read-package-up';
import updateNotifier from 'update-notifier';
import Configstore from 'configstore';
import {namespaceToName} from './utils/namespace.js';
import pkg from './utils/project-package.js';

/**
 * The router is in charge of handling `yo` different screens.
 * @constructor
 * @param  {Environment} env A yeoman environment instance
 * @param  {Configstore} [conf] An optional config store instance
 */
export default class Router {
  /** @type {import('yeoman-environment').default} */
  env;
  /** @type {import('@yeoman/adapter/types').InputOutputAdapter} */
  adapter;

  constructor({adapter, env, config}) {
    this.routes = {};
    this.env = env;
    this.adapter = adapter ?? env.adapter;
    this.conf = config || new Configstore(pkg.name, {
      generatorRunCount: {},
    });
  }

  /**
   * Navigate to a route
   * @param  {String} name Route name
   * @param  {*}      arg  A single argument to pass to the route handler
   * @return  {Promise<this>}
   */
  async navigate(name, argument) {
    if (typeof this.routes[name] === 'function') {
      await this.routes[name].call(null, this, argument);
      return this;
    }

    throw new Error(`No routes called: ${name}`);
  }

  /**
   * Register a route handler
   * @param {String}   name    Name of the route
   * @param {Function} handler Route handler
   */
  registerRoute(name, handler) {
    this.routes[name] = handler;
    return this;
  }

  /**
   * Update the available generators in the app
   * TODO: Move this function elsewhere, try to make it stateless.
   */
  updateAvailableGenerators() {
    this.generators = {};

    const resolveGenerators = generator => {
      // Skip sub generators
      if (!/:(app|all)$/.test(generator.namespace)) {
        return;
      }

      const {packageJson: package_} = readPackageUpSync({cwd: path.dirname(generator.resolved)});

      if (!package_) {
        return;
      }

      package_.namespace = generator.namespace;
      package_.appGenerator = true;
      package_.prettyName = titleize(humanizeString(namespaceToName(generator.namespace)));
      package_.update = updateNotifier({pkg: package_}).update;

      if (package_.update && package_.version !== package_.update.latest) {
        package_.updateAvailable = true;
      }

      this.generators[package_.name] = package_;
    };

    for (const generator of Object.values(this.env.getGeneratorsMeta())) {
      resolveGenerators(generator);
    }
  }
}
