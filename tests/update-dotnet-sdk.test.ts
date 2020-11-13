import fs = require('fs');
import os = require('os');
import path = require('path');

import * as update from '../src/update-dotnet-sdk';

describe('update-dotnet-sdk tests', () => {

  it('Updates the .NET SDK in global.json if a new version is available', async () => {
    const globalJsonPath = path.join(process.cwd(), 'global.json');
    const jsonContents = `{${os.EOL}"sdk": {${os.EOL}"version": "3.1.201"${os.EOL}}${os.EOL}}`;
    if (!fs.existsSync(globalJsonPath)) {
      fs.writeFileSync(globalJsonPath, jsonContents);
    }
    await update.run();
  }, 1000);
});
