// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';

export async function createGitRepo(globalJsonPath: string, data: string): Promise<void> {
  await fs.promises.writeFile(globalJsonPath, data);

  const cwd = path.dirname(globalJsonPath);
  const ignoreReturnCode = true;

  const git = async (...args: string[]): Promise<void> => {
    await execGit(args, cwd, ignoreReturnCode);
  };

  await git('init');
  await git('config', 'core.safecrlf', 'false');
  await git('config', 'user.email', 'test@test.local');
  await git('config', 'user.name', 'test');
  await git('add', '.');
  await git('commit', '-m', 'Initial commit');
}

export async function execGit(args: string[], cwd: string, ignoreReturnCode: boolean = false): Promise<string> {
  let commandOutput = '';
  let commandError = '';

  const options = {
    cwd,
    ignoreReturnCode,
    silent: ignoreReturnCode,
    listeners: {
      stdout: (data: Buffer) => {
        commandOutput += data.toString();
      },
      stderr: (data: Buffer) => {
        commandError += data.toString();
      }
    }
  };

  try {
    await exec.exec('git', args, options);
  } catch (error: any) {
    throw new Error(`The command 'git ${args.join(' ')}' failed: ${error}`);
  }

  if (commandError && !ignoreReturnCode) {
    throw new Error(commandError);
  }

  return commandOutput.trimEnd();
}
