'use strict';
var chalk = require('chalk');
var findUp = require('find-up');
var inquirer = require('inquirer');
var namespaceToName = require('yeoman-environment').namespaceToName;
var path = require('path');
var userHome = require('user-home');

// Checks if .yo-rc.json exists in parent directory
var filePath = findUp.sync('.yo-rc.json');
if (filePath !== null) {
  filePath = path.dirname(filePath);
}

function scaffoldInto(app, name) {
  var baseName = namespaceToName(name);
  inquirer.prompt([{
    name: 'scaffold',
    type: 'confirm',
    message: 'Are you sure you want to scaffold in ' + filePath +
      ' ?'
  }], function (answer) {
    if (answer.scaffold) {
      console.log(
        chalk.yellow('\nMake sure you are in the directory you want to scaffold into.') +
        chalk.dim('\nThis generator can also be run with: ') +
        chalk.blue('yo ' + baseName + '\n')
      );

      // save the generator run count
      var generatorRunCount = app.conf.get('generatorRunCount');
      generatorRunCount[baseName] = generatorRunCount[baseName] + 1 || 1;
      app.conf.set('generatorRunCount', generatorRunCount);
      app.env.run(name);
    } else {
      return;
    }
  });
}

module.exports = function (app, name) {
  var baseName = namespaceToName(name);
  app.insight.track('yoyo', 'run', baseName);

  if (filePath !== null && filePath !== process.cwd()) {
    scaffoldInto(app, name);
  } else if (process.cwd() === userHome) {
    filePath = userHome;
    scaffoldInto(app, name);
  } else {
    console.log(
      chalk.yellow('\nMake sure you are in the directory you want to scaffold into.') +
      chalk.dim('\nThis generator can also be run with: ') +
      chalk.blue('yo ' + baseName + '\n')
    );

    // save the generator run count
    var generatorRunCount = app.conf.get('generatorRunCount');
    generatorRunCount[baseName] = generatorRunCount[baseName] + 1 || 1;
    app.conf.set('generatorRunCount', generatorRunCount);
    app.env.run(name);
  }
};
