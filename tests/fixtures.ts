// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import nock from 'nock';
import { join } from 'path';
import * as fs from 'fs';

type Fixture = {
  scenarios: Scenario[];
};

type Scenario = {
  basePath: string;
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST';
  headers?: Record<string, string>;
  path: string;
  persist?: boolean;
  body?: any;
  status?: number;
  response: any;
  responseHeaders?: Record<string, string>;
};

nock.disableNetConnect();

export async function setup(name: string): Promise<void> {
  const fileName = join(__dirname, 'fixtures', `${name}.json`);
  const json = await fs.promises.readFile(fileName, 'utf8');
  const fixture: Fixture = JSON.parse(json);

  for (const scenario of fixture.scenarios) {
    let scope = nock(scenario.basePath);

    if (scenario.headers) {
      for (const [key, value] of Object.entries(scenario.headers)) {
        scope = scope.matchHeader(key, value);
      }
    }

    let interceptor: nock.Interceptor;

    if (scenario.persist) {
      scope = scope.persist();
    }

    if (scenario.method === 'DELETE') {
      interceptor = scope.delete(scenario.path, scenario.body);
    } else if (scenario.method === 'PATCH') {
      interceptor = scope.patch(scenario.path, scenario.body);
    } else if (scenario.method === 'POST') {
      interceptor = scope.post(scenario.path, scenario.body);
    } else {
      interceptor = scope.get(scenario.path);
    }

    interceptor.reply(scenario.status ?? 200, scenario.response, scenario.responseHeaders);
  }
}
