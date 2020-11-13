// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

export class UpdateResult {

  public readonly updated: boolean;
  public readonly version: string;
  public readonly pullRequestNumber: string;
  public readonly pullRequestUrl: string;

  constructor(updated: boolean, version: string, pullRequestNumber: string, pullRequestUrl: string) {
    this.updated = updated;
    this.version = version;
    this.pullRequestNumber = pullRequestNumber;
    this.pullRequestUrl = pullRequestUrl;
  }
}
