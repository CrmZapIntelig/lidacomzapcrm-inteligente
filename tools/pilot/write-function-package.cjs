const fs = require('node:fs');
const path = require('node:path');

module.exports = function writeFunctionPackage(output, name, main) {
  const { dependencies, engines } = require('../../staging-functions/package.json');
  const lock = JSON.parse(fs.readFileSync(require.resolve('../../staging-functions/package-lock.json'), 'utf8'));
  lock.name = name;
  lock.packages[''].name = name;
  const manifest = { name, private: true, main, engines, dependencies };
  for (const [file, data] of [['package.json', manifest], ['package-lock.json', lock]]) {
    fs.writeFileSync(path.join(output, file), JSON.stringify(data, null, 2) + '\n');
  }
};
