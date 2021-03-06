// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

export interface UpdateResult {

  pullRequestNumber: string;

  pullRequestUrl: string;

  updated: boolean;

  version: string;
}
