// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';
import * as path from 'path';

export async function run() {
  try {

    const channel = core.getInput('channel');
    const accessToken = core.getInput('repo-token');
    const globalJsonFileName = core.getInput('global-json-file');

    if (!channel) {
      core.setFailed("No release channel specified.");
      return;
    }

    if (!accessToken) {
      core.setFailed("No GitHub access token specified.");
      return;
    }

    if (!globalJsonFileName) {
      core.setFailed("No path to global.json file specified.");
      return;
    }

    const globalJsonPath = path.normalize(globalJsonFileName);

    if (!fs.existsSync(globalJsonPath)) {
      core.setFailed(`The global.json file '${globalJsonPath}' cannot be found.`);
      return;
    }

    const globalJson = JSON.parse(
      fs.readFileSync(globalJsonPath, { encoding: 'utf8' })
    );

    let currentVersion = null;

    if (globalJson.sdk && globalJson.sdk.version) {
      currentVersion = globalJson.sdk.version;
    }

    if (!currentVersion) {
      core.setFailed(`.NET SDK version cannot be found in '${globalJsonPath}'.`);
      return;
    }

    let updatedVersion = currentVersion;

    const branchName = core.getInput('branch-name');
    const commitMessage = core.getInput('commit-message');
    const userEmail = core.getInput('user-email');
    const userName = core.getInput('user-name');

    core.setOutput('pull-request-number', '');
    core.setOutput('pull-request-html-url', '');
    core.setOutput('sdk-updated', updatedVersion !== currentVersion);
    core.setOutput('sdk-version', updatedVersion);

    const payload = JSON.stringify(github.context.payload, undefined, 2);

    console.log(`The event payload: ${payload}`);

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
