'use strict';
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var userHome = require('user-home');

// Path to the config file
var globalConfigPath = path.join(userHome, '.yo-rc-global.json');

function write(content) {
  content = JSON.stringify(content, null, '  ');
  fs.writeFileSync(globalConfigPath, content);
}

/**
 * Return the content from `.yo-rc-global.json` as JSON object.
 * @return {Object} The store content
 */
function getAll() {
  if (fs.existsSync(globalConfigPath)) {
    return JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
  }
  return {};
}

/**
 * Delete the config with the given name from the global config.
 * @param  {String} name The generator which will be deleted
 */
function remove(name) {
  if (!_.isString(name)) {
    return;
  }

  var content = getAll();
  delete content[name];
  write(content);
}

/**
 * Delete all config the global config.
 */
function removeAll() {
  write({});
}

/**
 * Indicates whether the global config has content or not.
 * @return {Boolean}
 */
function hasContent() {
  return Object.keys(getAll()).length > 0;
}

module.exports = {
  getAll: getAll,
  remove: remove,
  removeAll: removeAll,
  hasContent: hasContent,
  path: globalConfigPath
};
