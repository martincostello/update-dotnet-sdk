# Update .NET SDK

[![Build status](https://github.com/martincostello/update-dotnet-sdk/actions/workflows/build.yml/badge.svg?branch=main&event=push)](https://github.com/martincostello/update-dotnet-sdk/actions/workflows/build.yml?query=branch%3Amain+event%3Apush)
[![codecov](https://codecov.io/gh/martincostello/update-dotnet-sdk/branch/main/graph/badge.svg)](https://codecov.io/gh/martincostello/update-dotnet-sdk)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/martincostello/update-dotnet-sdk/badge)](https://securityscorecards.dev/viewer/?uri=github.com/martincostello/update-dotnet-sdk)

This action updates the .NET SDK version specified by a `global.json` file stored in a GitHub repository.

An example Pull Request created by the action can be found here: [martincostello/update-dotnet-sdk#10][example-pull-request].

You can find out more information about this GitHub action in [this YouTube stream 📺][youtube-stream].

You can also find a sample repository that uses this action to automate .NET patch updateshere: [martincostello/dotnet-patch-automation-sample][patching-sample].

## Example Usage

```yml
steps:
- uses: actions/checkout@v4
- uses: martincostello/update-dotnet-sdk@v3
  with:
    repo-token: ${{ secrets.GITHUB_TOKEN }}
```

### Example Workflow

Below is a minimal example of a full GitHub Actions workflow to automate .NET SDK updates.

```yml
name: update-dotnet-sdk

on:

  # Scheduled trigger to check for .NET SDK updates at 2000 UTC every
  # Tuesday so that a run will coincide with monthly Update Tuesday releases,
  # which occur on the second Tuesday of the month (Pacific Standard Time),
  # for security and non-security improvements to the .NET SDK and runtime.
  schedule:
    - cron:  '00 20 * * TUE'

  # Manual trigger to update the .NET SDK on-demand.
  workflow_dispatch:

jobs:
  update-dotnet-sdk:
    name: Update .NET SDK
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: martincostello/update-dotnet-sdk@v3
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
```

### Targeting a Specific Branch

For scheduled workflows, the default branch is always used. This means that if
the `ref` input is not specified for the `actions/checkout` action, the workflow
will checkout the default branch of the repository.

If you wish a scheduled workflow to target another branch, you should explicitly
specify that branch in the workflow when checking out the code before the step
that uses this action to check for an update to the .NET SDK.

```yml
name: update-dotnet-sdk

on:
  schedule:
    - cron:  '00 20 * * TUE'
  workflow_dispatch:

jobs:
  update-dotnet-sdk:
    name: Update .NET SDK
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
      with:
        ref: 'dev' # Checkout the dev branch instead of the default branch
    - uses: martincostello/update-dotnet-sdk@v3
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced Workflow

Below are examples of an advanced GitHub Actions workflow to automate .NET SDK updates that will
also use the [dotnet-outdated][dotnet-outdated] .NET Global Tool to update any NuGet packages
for the current .NET SDK release channel that are available from NuGet.org if the .NET SDK is updated.

This workflow leverages a [GitHub reusable workflow][reusable-workflow-docs] that is
[included in this repository][reusable-workflow].

The workflow supports being used with a GitHub [personal access token][personal-access-token],
a [GitHub app][github-apps], or [`GITHUB_TOKEN`][github-token].

> **Note**
> Using `GITHUB_TOKEN` is not recommended due to restrictions when [triggering a workflow from another workflow][triggering-workflows-from-a-workflow].

#### With a Personal Access Token

This workflow uses a personal access token (PAT) to authenticate with GitHub on behalf of the
user associated with the PAT. The PAT must have at least the `public_repo` scope (or `repo` for
private repositories) to be able to push changes to the repository and open a pull request.

See the [GitHub documentation][personal-access-token] for more information on creating a PAT.

```yaml
name: update-dotnet-sdk

on:
  schedule:
    - cron:  '00 20 * * TUE'
  workflow_dispatch:

# No additional permissions are required for GITHUB_TOKEN as we are using a PAT.
permissions:
  contents: read

# The Git commit user name and email are set as variables in the organization or repository settings.
# See https://docs.github.com/actions/learn-github-actions/variables.
jobs:
  update-sdk:
    uses: martincostello/update-dotnet-sdk/.github/workflows/update-dotnet-sdk.yml@v3
    with:
      labels: "dependencies,.NET"
      user-email: ${{ vars.GIT_COMMIT_USER_EMAIL }}
      user-name: ${{ vars.GIT_COMMIT_USER_NAME }}
    secrets:
      repo-token: ${{ secrets.ACCESS_TOKEN }}
```

#### With a GitHub App

This workflow uses a GitHub app to authenticate with GitHub and perform the updates.
The app must have at least **Read and write** permissions for **Contents** and **Pull requests**
to be able to push changes to the repository and open a pull request.

See the [GitHub documentation][create-github-app] for more information on creating a GitHub app.

```yaml
name: update-dotnet-sdk

on:
  schedule:
    - cron:  '00 20 * * TUE'
  workflow_dispatch:

# No additional permissions are required for GITHUB_TOKEN as we are using an app.
permissions:
  contents: read

# The Git commit user name and email are set as variables in the organization or repository settings.
# See https://docs.github.com/actions/learn-github-actions/variables.
# You can obtain the user name and email for the GitHub app by running the following
# command using the GitHub CLI (https://cli.github.com/) in a terminal and substituting the values as shown below:
#
# app_name="YOUR_GITHUB_APP_NAME"
# echo "Git user name: ${app_name}[bot]"
# echo "Git user email: $(gh api "/users/${app_name}[bot]" --jq ".id")+${app_name}[bot]@users.noreply.github.com"
jobs:
  update-sdk:
    uses: martincostello/update-dotnet-sdk/.github/workflows/update-dotnet-sdk.yml@v3
    with:
      labels: "dependencies,.NET"
      user-email: ${{ vars.GIT_COMMIT_USER_EMAIL }}
      user-name: ${{ vars.GIT_COMMIT_USER_NAME }}
    secrets:
      application-id: ${{ secrets.UPDATER_APPLICATION_ID }}
      application-private-key: ${{ secrets.UPDATER_APPLICATION_PRIVATE_KEY }}
```

#### With GITHUB_TOKEN

This workflow uses the built-in `GITHUB_TOKEN` secret to authenticate with GitHub and
perform the updates as GitHub Actions. The token must have at least `write` permissions
for `contents` and `pull-requests` to be able to push changes to the repository and open
a pull request.

Using a personal access token or a GitHub app is recommended instead of using `GITHUB_TOKEN`,
otherwise pull requests opened by this workflow, and commits pushed, will not queue your CI
status checks if you use GitHub Actions for your CI. More information about this restriction
can be found here: [_Triggering a workflow from a workflow_][triggering-workflows-from-a-workflow].

See the [GitHub documentation][github-token] for more information on `GITHUB_TOKEN`.

```yaml
name: update-dotnet-sdk

on:
  schedule:
    - cron:  '00 20 * * TUE'
  workflow_dispatch:

permissions:
  contents: read
  pull-requests: read

jobs:
  update-sdk:
    uses: martincostello/update-dotnet-sdk/.github/workflows/update-dotnet-sdk.yml@v3
    permissions:
      contents: write
      pull-requests: write
    with:
      labels: "dependencies,.NET"
    secrets:
      repo-token: ${{ secrets.GITHUB_TOKEN }}
```

### Centralized Workflow

It is also possible from v2.4.0 to run the action or workflow from one repository
and then update the .NET SDK version in one or more other repositories. This removes
the need for each repository to have its own workflow to update the .NET SDK and
instead allows you to manage the update workflow from a single location.

> **Note**
> Using `GITHUB_TOKEN` is not supported in this scenario as the token only has access
> to the repository in which the workflow is run, and not to the other repositories
> you wish to update the .NET SDK in.
>
> Centralized workflows need to use either a Personal Access Token (PAT) or a GitHub App
> which has write access to the repositories you wish to update the .NET SDK within.

#### Centralized Updates With a GitHub App

An example workflow is shown below which uses a GitHub App to update the .NET SDK
in two different repositories in the same organization.

```yaml
name: update-dotnet-sdks

on:
  schedule:
    - cron:  '00 19 * * TUE'
  workflow_dispatch:

permissions: {}

jobs:
  update-sdk:
    name: 'update-${{ matrix.repo }}'
    uses: martincostello/update-dotnet-sdk/.github/workflows/update-dotnet-sdk.yml@v3

    concurrency:
      group: 'update-sdk-${{ matrix.repo }}'
      cancel-in-progress: false

    strategy:
      fail-fast: false
      matrix:
        repo: [ 'my-org/repo-1', 'my-org/repo-2' ]

    with:
      repo: ${{ matrix.repo }}
      user-email: ${{ vars.GIT_COMMIT_USER_EMAIL }}
      user-name: ${{ vars.GIT_COMMIT_USER_NAME }}
    secrets:
      application-id: ${{ secrets.UPDATER_APPLICATION_ID }}
      application-private-key: ${{ secrets.UPDATER_APPLICATION_PRIVATE_KEY }}
```

If the workflow is run in a repository that is not in the same organization as the
repositories to update, then the `organization` input must be specified so that the
GitHub App can correctly acquire an access token to be able to push .NET SDK updates
to the repositories.

```yaml
name: update-dotnet-sdks

on:
  schedule:
    - cron:  '00 19 * * TUE'
  workflow_dispatch:

permissions: {}

jobs:
  update-sdk:
    name: 'update-${{ matrix.repo }}'
    uses: martincostello/update-dotnet-sdk/.github/workflows/update-dotnet-sdk.yml@v3

    concurrency:
      group: 'update-sdk-${{ matrix.repo }}'
      cancel-in-progress: false

    strategy:
      fail-fast: false
      matrix:
        include:
          - repo: 'first-org/my-repo'
            org: 'first-org'
          - repo: 'second-org/other-repo'
            org: 'second-org'

    with:
      organization: ${{ matrix.org }}
      repo: ${{ matrix.repo }}
      user-email: ${{ vars.GIT_COMMIT_USER_EMAIL }}
      user-name: ${{ vars.GIT_COMMIT_USER_NAME }}
    secrets:
      application-id: ${{ secrets.UPDATER_APPLICATION_ID }}
      application-private-key: ${{ secrets.UPDATER_APPLICATION_PRIVATE_KEY }}
```

More advanced centralized workflows are possible, such as [this workflow][advanced-central-workflow]
which dynamically determines which repositories to update based on querying the GitHub API
for the repositories that the GitHub App used has contributor access to for its installation.

## .NET Daily Builds

From v2.3.0, it is possible to use this action to update to the latest
daily build of the .NET SDK from the publicly available .NET engineering
systems instead of the [officially released versions][dotnet-core-release-notes].

To consume daily builds, set the `quality` input to one of the following values:

- `daily`
- `signed`
- `validated`
- `preview`

By default, the channel to use for daily builds is derived from the current
SDK version specified in the `global.json` file in your GitHub repository.

Below is an example of using the action to update to the latest daily build
of the current .NET SDK version on the branch which the workflow is run from.

```yml
steps:
- uses: actions/checkout@v4
- uses: martincostello/update-dotnet-sdk@v3
  with:
    quality: 'daily'
    repo-token: ${{ secrets.GITHUB_TOKEN }}
```

You can see an example of such a pull request here: [martincostello/adventofcode#1120][example-pull-request-daily].

### Specific Channels

Ahead of the official release of a new .NET SDK version, the
[dotnet/dotnet][dotnet-dotnet-sdk] repository typically branches,
which causes the default channel to diverge in versioning compared to
the next official build that is being prepared. For example, ahead of
the release of .NET 10.0 preview 4, the `main` branch of the installer
repository was updated to produce builds of .NET 10.0 Preview 5.

In this scenario, to keep receiving daily builds of the .NET 10.0 preview 4
SDK (i.e. the next version to be officially released), the `channel`
input can be used to target a specific branch to obtain the latest .NET
SDK version from.

For example, the following actions YAML will update to the latest daily
build of the .NET 10.0 SDK from the `10.0.1xx-preview4` channel which,
corresponds to the `release/10.0.1xx-preview4` branch of the .NET SDK
installer repository.

```yml
steps:
- uses: actions/checkout@v4
- uses: martincostello/update-dotnet-sdk@v3
  with:
    channel: '10.0.1xx-preview4'
    quality: 'daily'
    repo-token: ${{ secrets.GITHUB_TOKEN }}
```

For more information about daily builds, see the [.NET repository][dotnet-dotnet-sdk].

## Inputs

## Required

| **Name** | **Description** |
|:--|:--|
| `repo-token` | The GitHub access token to use to create a Pull Request for any SDK update to the repository. |

### Optional

| **Name** | **Description** | **Default** |
|:--|:--|:--|
| `branch-name` | The optional Git branch name to use. | - |
| `channel` | The optional .NET release channel to download the SDK for (6.0, 7.0, etc.). | The channel derived from the current SDK version. |
| `close-superseded` | If true, any existing pull requests superseded by any pull request opened by the action are closed. | `true` |
| `commit-message` | The optional Git commit message to use. | - |
| `commit-message-prefix` | The optional Git commit message prefix to use if `commit-message` is not specified. | - |
| `generate-step-summary` | If true, will output a summary of any .NET SDK update to `$GITHUB_STEP_SUMMARY`. | `true` |
| `global-json-file` | The optional path to the global.json file to update the SDK for. | `./global.json` |
| `labels` | The optional comma-separated label(s) to apply to Pull Requests generated by the action. | - |
| `prerelease-label` | The optional pre-release label to restrict SDK updates to if a `quality` is specified. | - |
| `quality` | The optional value to specify using the latest build of the specified quality in the channel. | - |
| `repo` | The optional GitHub repository to generate the pull request against. | [`github.repository`][github-context] |
| `security-only` | If true, .NET SDK updates which do not contain security fixes are ignored. | `false` |
| `user-email` | The optional email address to use for the Git commit. | `github-actions[bot]@users.noreply.github.com` |
| `user-name` | The optional user name to use for the Git commit. | `github-actions[bot]` |
| `dry-run` | If true, the action will not push changes to GitHub. | `false` |

## Outputs

| **Name** | **Description** |
|:--|:--|
| `aspnetcore-version` | The version of the ASP.NET Core runtime associated with the updated .NET SDK. |
| `branch-name` | The name of the Git branch associated with the Pull Request created by the action if the .NET SDK is updated. |
| `pull-request-number` | The number of the Pull Request created by the action if the .NET SDK is updated. |
| `pull-request-html-url` | The HTML URL of the Pull Request created by the action if the .NET SDK is updated. |
| `pull-requests-closed` | A JSON array of the numbers of any pull requests that were closed as superseded. |
| `runtime-version` | The version of the .NET runtime associated with the updated .NET SDK. |
| `sdk-updated` | Whether the .NET SDK was updated by the action. |
| `sdk-version` | The latest version of the .NET SDK for the specified channel when the action completed. |
| `security` | Whether any .NET SDK update includes security fixes. |
| `windows-desktop-version` | The version of the Windows Desktop runtime associated with the updated .NET SDK. |

All of the above inputs and outputs are also available with the [reusable workflow][reusable-workflow].

## Feedback

Any feedback or issues can be added to the issues for this project in [GitHub][issues].

## Repository

The repository is hosted in [GitHub][update-dotnet-sdk]: <https://github.com/martincostello/update-dotnet-sdk.git>

## License

This project is licensed under the [Apache 2.0][license] license.

[advanced-central-workflow]: https://github.com/martincostello/github-automation/blob/df69301435a3f4971fa630e65a3966762187c87b/.github/workflows/update-dotnet-sdks.yml
[create-github-app]: https://docs.github.com/apps/creating-github-apps/creating-github-apps/creating-a-github-app
[dotnet-dotnet-sdk]: https://github.com/dotnet/dotnet#installing-the-sdk
[dotnet-outdated]: https://github.com/dotnet-outdated/dotnet-outdated
[dotnet-core-release-notes]: https://github.com/dotnet/core/tree/main/release-notes
[example-pull-request]: https://github.com/martincostello/update-dotnet-sdk/pull/10
[example-pull-request-daily]: https://github.com/martincostello/adventofcode/pull/1120
[github-apps]: https://docs.github.com/apps/creating-github-apps/creating-github-apps/about-apps
[github-context]: https://docs.github.com/actions/learn-github-actions/contexts#github-context
[github-token]: https://docs.github.com/actions/security-guides/automatic-token-authentication
[issues]: https://github.com/martincostello/update-dotnet-sdk/issues
[license]: https://www.apache.org/licenses/LICENSE-2.0.txt
[patching-sample]: https://github.com/martincostello/dotnet-patch-automation-sample "martincostello/dotnet-patch-automation-sample - GitHub"
[personal-access-token]: https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
[reusable-workflow]: https://github.com/martincostello/update-dotnet-sdk/blob/main/.github/workflows/update-dotnet-sdk.yml
[reusable-workflow-docs]: https://docs.github.com/actions/using-workflows/reusing-workflows
[update-dotnet-sdk]: https://github.com/martincostello/update-dotnet-sdk
[triggering-workflows-from-a-workflow]: https://docs.github.com/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow
[youtube-stream]: https://www.youtube.com/live/pOeT1otTi4M?si=ICmCcEHeh94X0vBT&t=172 "On .NET Live - Effortless .NET updates with GitHub Actions - YouTube"
