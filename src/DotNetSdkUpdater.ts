// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';

import { HttpClient } from '@actions/http-client';
import { UpdateOptions } from './UpdateOptions';
import { UpdateResult } from './UpdateResult';
import { Writable } from 'stream';

export class DotNetSdkUpdater {
  private options: UpdateOptions;
  private repoPath: string;

  constructor(options: UpdateOptions) {
    this.options = options;
    this.repoPath = path.dirname(this.options.globalJsonPath);
  }

  public static getLatestRelease(currentSdkVersion: string, releaseInfo: any): SdkVersions {
    const latestSdkVersion = releaseInfo['latest-sdk'];

    const currentRelease = DotNetSdkUpdater.getReleaseForSdk(currentSdkVersion, releaseInfo);
    const latestRelease = DotNetSdkUpdater.getReleaseForSdk(latestSdkVersion, releaseInfo);

    return {
      current: currentRelease,
      latest: latestRelease,
    };
  }

  public static generateCommitMessage(currentSdkVersion: string, latestSdkVersion: string): string {
    const currentVersion = currentSdkVersion.split('.');
    const latestVersion = latestSdkVersion.split('.');

    const updateKind =
      parseInt(latestVersion[0], 10) > parseInt(currentVersion[0], 10)
        ? 'major'
        : parseInt(latestVersion[1], 10) > parseInt(currentVersion[1], 10)
        ? 'minor'
        : 'patch';

    const messageLines = [
      'Update .NET SDK',
      '',
      `Update .NET SDK to version ${latestSdkVersion}.`,
      '',
      '---',
      'updated-dependencies:',
      '- dependency-name: Microsoft.NET.Sdk',
      '  dependency-type: direct:production',
      `  update-type: version-update:semver-${updateKind}`,
      '...',
      '',
      '',
    ];
    return messageLines.join('\n');
  }

  public async tryUpdateSdk(): Promise<UpdateResult> {
    const globalJson = JSON.parse(fs.readFileSync(this.options.globalJsonPath, { encoding: 'utf8' }));

    let sdkVersion = '';

    if (globalJson.sdk && globalJson.sdk.version) {
      sdkVersion = globalJson.sdk.version;
    }

    if (!sdkVersion) {
      throw new Error(`.NET SDK version cannot be found in '${this.options.globalJsonPath}'.`);
    }

    if (!this.options.channel) {
      const versionParts = sdkVersion.split('.');

      if (versionParts.length < 2) {
        throw new Error(`.NET SDK version '${sdkVersion}' is not valid.`);
      }

      this.options.channel = `${versionParts[0]}.${versionParts[1]}`;
    }

    const releases = await this.getDotNetReleases();
    const releaseInfo = DotNetSdkUpdater.getLatestRelease(sdkVersion, releases);

    const result: UpdateResult = {
      pullRequestNumber: 0,
      pullRequestUrl: '',
      updated: false,
      version: releaseInfo.current.sdkVersion,
    };

    core.info(`Current .NET SDK version is ${releaseInfo.current.sdkVersion}`);
    core.info(`Current .NET runtime version is ${releaseInfo.current.runtimeVersion}`);
    core.info(
      `Latest .NET SDK version for channel '${this.options.channel}' is ${releaseInfo.latest.sdkVersion} (runtime version ${releaseInfo.latest.runtimeVersion})`
    );

    const versionUpdated = releaseInfo.current.sdkVersion !== releaseInfo.latest.sdkVersion;

    if (versionUpdated) {
      const baseBranch = await this.applySdkUpdate(globalJson, releaseInfo);

      if (baseBranch) {
        const pullRequest = await this.createPullRequest(baseBranch, releaseInfo);
        result.pullRequestNumber = pullRequest.number;
        result.pullRequestUrl = pullRequest.url;

        result.updated = true;
        result.version = releaseInfo.latest.sdkVersion;
      }
    } else {
      core.info('The current .NET SDK version is up-to-date');
    }

    return result;
  }

  private async createPullRequest(base: string, versions: SdkVersions): Promise<PullRequest> {
    const title = `Update .NET SDK to ${versions.latest.sdkVersion}`;

    let body = `Updates the .NET SDK to version \`${versions.latest.sdkVersion}\`, `;

    if (versions.latest.runtimeVersion === versions.current.runtimeVersion) {
      body += `which includes version [\`\`${versions.latest.runtimeVersion}\`\`](${versions.latest.releaseNotes}) of the .NET runtime.`;
    } else {
      body += `which also updates the .NET runtime from version [\`\`${versions.current.runtimeVersion}\`\`](${versions.current.releaseNotes}) to version [\`\`${versions.latest.runtimeVersion}\`\`](${versions.latest.releaseNotes}).`;
    }

    if (versions.latest.security && versions.latest.securityIssues.length > 0) {
      let issues: CveInfo[] = versions.latest.securityIssues;

      if (versions.current.security && versions.current.securityIssues.length > 0) {
        issues = issues.filter((issue) => versions.current.securityIssues.findIndex((other) => other.id === issue.id) < 0);
      }

      if (issues.length > 0) {
        body += `\n\nThis release includes fixes for the following security issue(s):`;
        for (const issue of issues) {
          body += `\n  * [${issue.id}](${issue.url})`;
        }
      }
    }

    let summaryBody = body;

    body += `\n\nThis pull request was auto-generated by [GitHub Actions](${this.options.serverUrl}/${this.options.repo}/actions/runs/${this.options.runId}).`;

    const options = {
      baseUrl: this.options.apiUrl,
    };

    const octokit = github.getOctokit(this.options.accessToken, options);

    const split = (this.options.repo ?? '/').split('/');
    const owner = split[0];
    const repo = split[1];

    const request = {
      owner,
      repo,
      title,
      head: this.options.branch,
      base,
      body,
      maintainer_can_modify: true,
      draft: false,
    };

    if (this.options.dryRun) {
      core.info(`Skipped creating GitHub Pull Request for branch ${this.options.branch} to ${base}`);
      return {
        number: 0,
        url: '',
      };
    }

    const response = await octokit.rest.pulls.create(request);

    core.debug(JSON.stringify(response, null, 2));

    core.info(`Created pull request #${response.data.number}: ${response.data.title}`);
    core.info(`View the pull request at ${response.data.html_url}`);

    summaryBody += `\n\nView the pull request at [#${response.data.number}](${response.data.html_url}).\n`;

    await core.summary.addHeading(title, 1).addRaw(summaryBody).write();

    const result = {
      number: response.data.number,
      url: response.data.html_url,
    };

    if (this.options.labels) {
      const labelsToApply = this.options.labels.split(',');

      if (labelsToApply.length > 0) {
        try {
          await octokit.rest.issues.addLabels({
            owner,
            repo,
            issue_number: result.number,
            labels: labelsToApply,
          });
        } catch (error: any) {
          core.error(`Failed to apply label(s) to Pull Request #${result.number}`);
          core.error(error);
        }
      }
    }

    return result;
  }

  private async execGit(args: string[], ignoreErrors: Boolean = false): Promise<string> {
    let commandOutput = '';
    let commandError = '';

    const options = {
      cwd: this.repoPath,
      errStream: new NullWritable(),
      outStream: new NullWritable(),
      ignoreReturnCode: ignoreErrors as boolean | undefined,
      silent: ignoreErrors as boolean | undefined,
      listeners: {
        stdout: (data: Buffer) => {
          commandOutput += data.toString();
        },
        stderr: (data: Buffer) => {
          commandError += data.toString();
        },
      },
    };

    try {
      await exec.exec('git', args, options);
    } catch (error: any) {
      throw new Error(`The command 'git ${args.join(' ')}' failed: ${error}`);
    }

    if (commandError && !ignoreErrors) {
      throw new Error(commandError);
    }

    core.debug(`git std-out: ${commandOutput}`);

    if (commandError) {
      core.debug(`git std-err: ${commandError}`);
    }

    return commandOutput.trimEnd();
  }

  private async getDotNetReleases(): Promise<any> {
    const httpClient = new HttpClient('martincostello/update-dotnet-sdk', [], {
      allowRetries: true,
      maxRetries: 3,
    });

    const releasesUrl = `https://raw.githubusercontent.com/dotnet/core/main/release-notes/${this.options.channel}/releases.json`;

    core.debug(`Downloading .NET ${this.options.channel} release notes JSON from ${releasesUrl}...`);

    const releasesResponse = await httpClient.getJson<any>(releasesUrl);

    if (releasesResponse.statusCode >= 400) {
      throw new Error(`Failed to get releases JSON for channel ${this.options.channel} - HTTP status ${releasesResponse.statusCode}`);
    }

    return releasesResponse.result || {};
  }

  private static getReleaseForSdk(sdkVersion: string, releaseInfo: any): ReleaseInfo {
    const releases: any[] = releaseInfo['releases'];
    let foundSdk: any = null;

    let foundRelease = releases.filter((info: any) => {
      const sdk = info['sdk'];
      if (sdk['version'] === sdkVersion) {
        foundSdk = sdk;
        return true;
      }
      return false;
    });

    if (foundRelease.length < 1) {
      foundRelease = releases.filter((info: any) => {
        const sdks: any[] = info['sdks'];

        if (sdks !== null) {
          for (const sdk of sdks) {
            if (sdk['version'] === sdkVersion) {
              foundSdk = sdk;
              return true;
            }
          }
        }

        return false;
      });
    }

    if (foundRelease.length < 1) {
      throw new Error(`Failed to find release for .NET SDK version ${sdkVersion}`);
    }

    const release = foundRelease[0];

    const result = {
      releaseNotes: release['release-notes'],
      runtimeVersion: release['runtime']['version'],
      sdkVersion: foundSdk['version'],
      security: release['security'],
      securityIssues: [] as CveInfo[],
    };

    if (result.security) {
      const issues: any[] = release['cve-list'];

      if (issues) {
        result.securityIssues = issues.map((issue: any) => ({
          id: issue['cve-id'],
          url: issue['cve-url'],
        }));
      }
    }

    return result;
  }

  private async applySdkUpdate(globalJson: any, releaseInfo: SdkVersions): Promise<string | undefined> {
    core.info(`Updating .NET SDK version in '${this.options.globalJsonPath}' to ${releaseInfo.latest.sdkVersion}...`);

    // Get the base branch to use later to create the Pull Request
    const base = await this.execGit(['rev-parse', '--abbrev-ref', 'HEAD']);

    // Apply the update to the file system
    globalJson.sdk.version = releaseInfo.latest.sdkVersion;
    const json = JSON.stringify(globalJson, null, 2) + os.EOL;

    fs.writeFileSync(this.options.globalJsonPath, json, { encoding: 'utf8' });
    core.info(`Updated SDK version in '${this.options.globalJsonPath}' to ${releaseInfo.latest.sdkVersion}`);

    // Configure Git
    if (!this.options.branch) {
      this.options.branch = `update-dotnet-sdk-${releaseInfo.latest.sdkVersion}`.toLowerCase();
    }

    if (!this.options.commitMessage) {
      this.options.commitMessage = DotNetSdkUpdater.generateCommitMessage(releaseInfo.current.sdkVersion, releaseInfo.latest.sdkVersion);
    }

    if (this.options.userName) {
      await this.execGit(['config', 'user.name', this.options.userName]);
      core.info(`Updated git user name to '${this.options.userName}'`);
    }

    if (this.options.userEmail) {
      await this.execGit(['config', 'user.email', this.options.userEmail]);
      core.info(`Updated git user email to '${this.options.userEmail}'`);
    }

    if (this.options.repo) {
      await this.execGit(['remote', 'set-url', 'origin', `${this.options.serverUrl}/${this.options.repo}.git`]);
      await this.execGit(['fetch', 'origin'], true);
    }

    core.debug(`Branch: ${this.options.branch}`);
    core.debug(`Commit message: ${this.options.commitMessage}`);
    core.debug(`User name: ${this.options.userName}`);
    core.debug(`User email: ${this.options.userEmail}`);

    const branchExists = await this.execGit(['rev-parse', '--verify', '--quiet', `remotes/origin/${this.options.branch}`], true);

    if (branchExists) {
      core.info(`The ${this.options.branch} branch already exists`);
      return undefined;
    }

    await this.execGit(['checkout', '-b', this.options.branch], true);
    core.info(`Created git branch ${this.options.branch}`);

    await this.execGit(['add', this.options.globalJsonPath]);
    core.info(`Staged git commit for '${this.options.globalJsonPath}'`);

    await this.execGit(['commit', '-m', this.options.commitMessage]);

    const sha1 = await this.execGit(['log', "--format='%H'", '-n', '1']);
    const shortSha1 = sha1.replace(/'/g, '').substring(0, 7);

    core.info(`Committed .NET SDK update to git (${shortSha1})`);

    if (!this.options.dryRun && this.options.repo) {
      await this.execGit(['push', '-u', 'origin', this.options.branch], true);
      core.info(`Pushed changes to repository (${this.options.repo})`);
    }

    return base;
  }
}

interface CveInfo {
  id: string;
  url: string;
}

interface PullRequest {
  number: number;
  url: string;
}

interface ReleaseInfo {
  releaseNotes: string;
  runtimeVersion: string;
  sdkVersion: string;
  security: boolean;
  securityIssues: CveInfo[];
}

interface SdkVersions {
  current: ReleaseInfo;
  latest: ReleaseInfo;
}

class NullWritable extends Writable {
  _write(_chunk: any, _encoding: string, callback: (error?: Error | null) => void): void {
    callback();
  }
  _writev(_chunks: { chunk: any; encoding: string }[], callback: (error?: Error | null) => void): void {
    callback();
  }
}
