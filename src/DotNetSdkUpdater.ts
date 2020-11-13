// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import { UpdateResult } from './UpdateResult';

export class DotNetSdkUpdater {

  private currentVersion: string;

  constructor(currentVersion: string) {
    this.currentVersion = currentVersion;
  }

  public async tryUpdateSdk(): Promise<UpdateResult> {

    const updatedVersion = "3.1.404";

    const result: UpdateResult = {
      pullRequestNumber: "",
      pullRequestUrl: "",
      updated: updatedVersion !== this.currentVersion,
      version: updatedVersion
    };

    return Promise.resolve(result);
  }
}
