import io = require('@actions/io');
import fs = require('fs');
import os = require('os');
import path = require('path');

import * as update from '../src/update-dotnet-sdk';

describe('update-dotnet-sdk tests', () => {

  const inputs = {
    'INPUT_channel': "3.1",
    'INPUT_global-json-file': './global.json',
    'INPUT_repo-token': "my-token"
  };

  beforeEach(() => {
    for (const key in inputs) {
      process.env[key] = inputs[key as keyof typeof inputs]
    }
    process.stdout.write = jest.fn()
  })

  afterAll(async () => {
    try {
      await io.rmRF(path.join(process.cwd(), 'global.json'));
    } catch {
      console.log('Failed to remove test directories');
    }
  }, 5000);

  it('Updates the .NET SDK in global.json if a new version is available', async () => {

    const globalJsonPath = path.join(process.cwd(), 'global.json');
    const sdkVersion = "3.1.201";
    const jsonContents = `{${os.EOL}"sdk": {${os.EOL}"version": "${sdkVersion}"${os.EOL}}${os.EOL}}`;

    if (!fs.existsSync(globalJsonPath)) {
      fs.writeFileSync(globalJsonPath, jsonContents);
    }

    for (const key in inputs) {
      process.env[key] = inputs[key as keyof typeof inputs]
    }

    await update.run();

    assertWriteCalled(`::set-output name=sdk-updated output::true${os.EOL}`);

    const globalJson = JSON.parse(
      fs.readFileSync(globalJsonPath, { encoding: 'utf8' })
    );

    const actualVersion: string = globalJson.sdk.version;

    expect(actualVersion).not.toBe(sdkVersion);
  }, 10000);
});

function assertWriteCalled(message: string): void {
  expect(process.stdout.write).toHaveBeenCalledWith(message);
}
