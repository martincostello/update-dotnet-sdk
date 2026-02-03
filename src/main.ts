// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { context } from '@actions/github';

import { DotNetSdkUpdater } from './DotNetSdkUpdater.js';
import { UpdateOptions } from './UpdateOptions.js';

export async function run(): Promise<void> {
  try {
    const accessToken = core.getInput('repo-token', { required: true });
    const globalJsonFileName = core.getInput('global-json-file', {
      required: true,
    });

    let globalJsonPath = path.normalize(globalJsonFileName);
    globalJsonPath = path.resolve(globalJsonPath);

    if (!fs.existsSync(globalJsonPath)) {
      core.setFailed(`The global.json file '${globalJsonPath}' cannot be found.`);
      return;
    }

    const options: UpdateOptions = {
      accessToken,
      apiUrl: context.apiUrl,
      branch: core.getInput('branch-name', { required: false }),
      channel: core.getInput('channel', { required: false }),
      closeSuperseded: true,
      commitMessage: core.getInput('commit-message', { required: false }),
      commitMessagePrefix: core.getInput('commit-message-prefix', { required: false }),
      dryRun: core.getInput('dry-run', { required: false }) === 'true',
      generateStepSummary: core.getInput('generate-step-summary', { required: false }) === 'true',
      globalJsonPath,
      labels: core.getInput('labels', { required: false }) ?? '',
      prereleaseLabel: core.getInput('prerelease-label', { required: false }),
      quality: core.getInput('quality', { required: false }),
      repo: core.getInput('repo', { required: false }) ?? process.env.GITHUB_REPOSITORY,
      runId: context.runId.toString(10),
      runRepo: process.env.GITHUB_REPOSITORY,
      securityOnly: core.getInput('security-only', { required: false }) === 'true',
      serverUrl: context.serverUrl,
      userEmail: core.getInput('user-email', { required: false }),
      userName: core.getInput('user-name', { required: false }),
    };

    const supersededOption = core.getInput('close-superseded', {
      required: false,
    });
    if (supersededOption) {
      options.closeSuperseded = supersededOption === 'true';
    }

    const updater = new DotNetSdkUpdater(options);
    const result = await updater.tryUpdateSdk();

    core.setOutput('aspnetcore-version', result.runtimeVersions?.aspNetCore ?? '');
    core.setOutput('branch-name', result.branchName);
    core.setOutput('pull-request-number', result.pullRequestNumber);
    core.setOutput('pull-request-html-url', result.pullRequestUrl);
    core.setOutput('pull-requests-closed', JSON.stringify(result.supersedes));
    core.setOutput('runtime-version', result.runtimeVersions?.runtime ?? '');
    core.setOutput('sdk-updated', result.updated);
    core.setOutput('sdk-version', result.version);
    core.setOutput('security', result.security);
    core.setOutput('windows-desktop-version', result.runtimeVersions?.windowsDesktop ?? '');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    core.error('Failed to check for updates to .NET SDK');
    core.error(error);
    if (error instanceof Error) {
      if (error.stack) {
        core.error(error.stack);
      }
      core.setFailed(error.message);
    }
  }
}

if (require.main === module) {
  run();
}
