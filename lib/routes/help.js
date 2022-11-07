'use strict';
const inquirer = require('inquirer');
const open = require('open');

module.exports = async app => {
  return inquirer.prompt([{
    name: 'whereTo',
    type: 'list',
    message: 'Here are a few helpful resources.\n\nI will open the link you select in your browser for you',
    choices: [{
      name: 'Take me to the documentation',
      value: 'http://yeoman.io/learning/'
    }, {
      name: 'View Frequently Asked Questions',
      value: 'http://yeoman.io/learning/faq.html'
    }, {
      name: 'File an issue on GitHub',
      value: 'http://yeoman.io/contributing/opening-issues.html'
    }, {
      name: 'Take me back home, Yo!',
      value: 'home'
    }]
  }]).then(async answer => {
    if (answer.whereTo === 'home') {
      console.log('I get it, you like learning on your own. I respect that.');
      return app.navigate('home');
    }

    open(answer.whereTo);
  });
};
