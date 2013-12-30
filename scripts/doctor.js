var chalk = require('chalk');
var shell = require('shelljs');

var isWin = !!process.platform.match(/^win/);
var pathSep = isWin ? ';' : ':';

var doctor = {
  errors: [],

  run: function () {
    this.checkNodePath();

    this.logErrors();
  },

  logErrors: function () {
    if (!this.errors.length) {
      console.log(chalk.green('[Yeoman Doctor] Everything looks allright!'));
      console.log();
      return;
    }
    console.log(chalk.red('[Yeoman Doctor] Uh oh, I found potential errors on your machine\n---------------\n'));
    this.errors.forEach(function (errMsg) {
      console.log('[' + chalk.red('Error') + '] ' + errMsg);
      console.log();
    });
  },

  checkNodePath: function () {
    if (!process.env.NODE_PATH) return;
    var nodePaths = process.env.NODE_PATH.split(pathSep);
    var npmRoot = shell.exec('npm -g root', { silent: true }).output.replace(/([\r\n])$/, '');
    if (nodePaths.indexOf(npmRoot) < 0) {
      this.nodePathMismatch({
        nodePaths: nodePaths,
        npmRoot: npmRoot
      });
    }
  },

  nodePathMismatch: function (val) {
    var output = '';
    output += 'NPM root value is not in your NODE_PATH\n';
    output += '  [' + chalk.cyan('info') + ']\n';
    output += [
      '    NODE_PATH = ' + val.nodePaths.join(pathSep),
      '    NPM root  = ' + val.npmRoot
    ].join('\n');
    output += '\n\n  [' + chalk.cyan('Fix') + '] Append the NPM root value to your NODE_PATH variable\n';

    if (!isWin) {
      output += [
        '    Add this line to your .bashrc',
        '      export NODE_PATH=$NODE_PATH:' + val.npmRoot,
        '    Or run this command',
        '      echo "export NODE_PATH=$NODE_PATH:' + val.npmRoot + '" >> ~/.bashrc && source ~/.bashrc'
      ].join('\n');
    }

    this.errors.push(output);
  }
};

doctor.run();
