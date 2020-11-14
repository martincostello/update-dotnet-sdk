// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';

import { DotNetSdkUpdater } from './DotNetSdkUpdater';
import { UpdateOptions } from './UpdateOptions';

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

    const options: UpdateOptions = {
      accessToken: accessToken,
      branch: core.getInput('branch-name'),
      channel: channel,
      commitMessage: core.getInput('commit-message'),
      dryRun: core.getInput('dry-run') === "true",
      globalJsonPath: globalJsonPath,
      userEmail: core.getInput('user-email'),
      userName: core.getInput('user-name')
    };

    const updater = new DotNetSdkUpdater(options);
    const result = await updater.tryUpdateSdk();

    core.setOutput('pull-request-number', result.pullRequestNumber);
    core.setOutput('pull-request-html-url', result.pullRequestUrl);
    core.setOutput('sdk-updated', result.updated);
    core.setOutput('sdk-version', result.version);

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
