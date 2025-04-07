import chalk from 'chalk';
import checkbox from '@inquirer/checkbox';
import spawn from 'cross-spawn';

const successMessage = 'I\'ve just updated your generators. Remember, you can update\na specific generator with npm by running:\n'
  + chalk.magenta('\n    npm install -g generator-_______');

async function updateSuccess(app) {
  console.log(`\n${chalk.cyan(successMessage)}\n`);
  app.env.lookup();
  await app.updateAvailableGenerators();
  app.navigate('home');
}

function updateGenerators(app, pkgs) {
  spawn('npm', ['install', '--global', ...pkgs], {stdio: 'inherit'})
    .on('close', updateSuccess.bind(null, app));
}

export const update = async app => {
  const generators = await checkbox({
    message: 'Generators to update',
    validate(input) {
      return input.length > 0 ? true : 'Please select at least one generator to update.';
    },
    choices: Object.keys(app.generators || {}).map(key => ({
      name: app.generators[key].name,
      checked: true,
    })),
  });
  return updateGenerators(app, generators);
};
