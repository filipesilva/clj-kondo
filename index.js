const { createWriteStream, mkdirSync } = require('fs');
const { extname, join } = require('path');
const binwrap = require('binwrap');
const https = require('https');

const packageInfo = require(join(__dirname, 'package.json'));
// This package uses the original version ('2019.10.11') plus a prerelease number (`.1`)
// if needed, so we need to strip the suffix.
// Need to keep the string somewhere that's not the version because npm will remove leading
// zeroes from what it thinks is semver (e.g. 2020.01.01 -> 2020.1.1).
const version = packageInfo['version-string'].slice(0, '2019.10.11'.length);
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
    'win32-x64': root + `/clj-kondo-${version}-windows-amd64.zip`,
  }
});

function downloadFile(url, file) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location, file)
          .then(resolve)
          .catch(reject);
      }
      else if (response.statusCode < 200 || response.statusCode >= 300) {
        reject(new Error(`Failed to download file: ${response.statusCode} ${response.statusMessage}`));
      }
      else {
        const fileStream = createWriteStream(file);
        response.pipe(fileStream);
        fileStream.on('finish', () => resolve());
        fileStream.on('error', (error) => reject(error));
      }
    }).on('error', (error) => reject(error));
  });
}

// Wrap the original install method to provide a fallback.
const originalInstall = configuredBinwrap.install.bind(configuredBinwrap);
configuredBinwrap.install = function (unpackedBinPath, os, arch) {
  mkdirSync(unpackedBinPath, { recursive: true });
  try {
    return originalInstall(unpackedBinPath, os, arch);
  } catch (error) {
    if (error.message.includes('No binaries are available for your platform')) {
      const fallbackFile = join(unpackedBinPath, `${binary}${extname(fallback)}`);
      return downloadFile(fallback, fallbackFile);
    }
  }
};



module.exports = configuredBinwrap;
