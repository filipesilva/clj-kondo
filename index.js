const binwrap = require('binwrap');
const path = require('path');

const packageInfo = require(path.join(__dirname, 'package.json'));
const version = packageInfo.version;
const root = `https://github.com/borkdude/clj-kondo/releases/download/v${version}`;

module.exports = binwrap({
  dirname: __dirname,
  binaries: [
    'clj-kondo',
  ],
  urls: {
    'darwin-x64': root + `/clj-kondo-${version}-macos-amd64.zip`,
    'linux-x64': root + `/clj-kondo-${version}-linux-amd64.zip`,
  }
});