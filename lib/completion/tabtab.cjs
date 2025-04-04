const Tabtab = require('tabtab');

// eslint-disable-next-line new-cap
const tabtab = new Tabtab.Commands.default({
  name: 'yo',
  completer: 'yo-complete',
  cache: false
});

module.exports = tabtab;
