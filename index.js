const { createWriteStream, writeFile, mkdirSync } = require('fs');
const { extname, join } = require('path');
const binwrap = require('binwrap');
const request = require('request');

const packageInfo = require(join(__dirname, 'package.json'));
// This package uses the original version ('2019.10.11-alpha') plus a prerelease number (`.1`) 
// if needed, so we need to strip the suffix.
const version = packageInfo.version.slice(0, '2019.10.11-alpha'.length);
const root = `https://github.com/borkdude/clj-kondo/releases/download/v${version}`;
const fallback = root + `/clj-kondo-${version}-standalone.jar`;
const binary = 'clj-kondo';

// Note: We're not running `binwrap prepare` because `bin/clj-kondo` contains logic
// to use the fallback.
// Consider dropping binwrap altogether if we're just overriding functionality.
const configuredBinwrap = binwrap({
  dirname: __dirname,
  binaries: [
    binary,
  ],
  urls: {
    'darwin-x64': root + `/clj-kondo-${version}-macos-amd64.zip`,
    'linux-x64': root + `/clj-kondo-${version}-linux-amd64.zip`,
  }
});

// Wrap the original install method to provide a fallback.
const originalInstall = configuredBinwrap.install.bind(configuredBinwrap);
configuredBinwrap.install = function (unpackedBinPath, os, arch) {
  mkdirSync(unpackedBinPath, { recursive: true });
  try {
    return originalInstall(unpackedBinPath, os, arch);
  } catch (error) {
    if (error.message.includes('No binaries are available for your platform')) {
      return new Promise((resolve, reject) => {
        const fallbackFile = join(unpackedBinPath, `${binary}${extname(fallback)}`);
        request(fallback)
          .pipe(createWriteStream(fallbackFile))
          .on('finish', () => resolve())
          .on('error', error => reject(error));
      });
    }
  }
};



module.exports = configuredBinwrap;