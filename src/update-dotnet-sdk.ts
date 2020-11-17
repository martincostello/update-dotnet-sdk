// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from "@actions/core";
import * as fs from "fs";
import * as path from "path";

import { DotNetSdkUpdater } from "./DotNetSdkUpdater";
import { UpdateOptions } from "./UpdateOptions";

export async function run() {
  try {

    const accessToken = core.getInput("repo-token", { required: true });
    const globalJsonFileName = core.getInput("global-json-file", { required: true });

    const globalJsonPath = path.normalize(globalJsonFileName);

    if (!fs.existsSync(globalJsonPath)) {
      core.setFailed(`The global.json file '${globalJsonPath}' cannot be found.`);
      return;
    }

    const options: UpdateOptions = {
      accessToken: accessToken,
      branch: core.getInput("branch-name", { required: false }),
      channel: core.getInput("channel", { required: false }),
      commitMessage: core.getInput("commit-message", { required: false }),
      dryRun: core.getInput("dry-run", { required: false }) === "true",
      globalJsonPath: globalJsonPath,
      repo: process.env.GITHUB_REPOSITORY,
      runId: process.env.GITHUB_RUN_ID,
      userEmail: core.getInput("user-email", { required: false }),
      userName: core.getInput("user-name", { required: false })
    };

    const updater = new DotNetSdkUpdater(options);
    const result = await updater.tryUpdateSdk();

    core.setOutput("pull-request-number", result.pullRequestNumber);
    core.setOutput("pull-request-html-url", result.pullRequestUrl);
    core.setOutput("sdk-updated", result.updated);
    core.setOutput("sdk-version", result.version);

  } catch (error) {
    core.error("Failed to check for updates to .NET SDK");
    core.error(error);
    core.setFailed(error.message);
  }
}

if (require.main === module) {
  run();
}
