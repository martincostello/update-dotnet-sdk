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

    const branchName = core.getInput('branch-name');
    const commitMessage = core.getInput('commit-message');
    const globalJsonFileName = core.getInput('global-json-file');
    const userEmail = core.getInput('user-email');
    const userName = core.getInput('user-name');

    core.setOutput('pull-request-number', '');
    core.setOutput('pull-request-html-url', '');
    core.setOutput('sdk-updated', false);
    core.setOutput('sdk-version', '5.0.100');

    const payload = JSON.stringify(github.context.payload, undefined, 2);

    console.log(`The event payload: ${payload}`);

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
