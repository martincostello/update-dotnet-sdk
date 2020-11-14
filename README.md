# Update .NET SDK

[![Build status](https://github.com/martincostello/update-dotnet-sdk/workflows/build/badge.svg?branch=main&event=push)](https://github.com/martincostello/update-dotnet-sdk/actions?query=workflow%3Abuild+branch%3Amain+event%3Apush)

This action updates the .NET SDK version specified by a `global.json` file stored in a GitHub repository.

## Example Usage

```yml
steps:
- uses: actions/checkout@v2
- uses: martincostello/update-dotnet-sdk@v1
  with:
    repo-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

## Required

| **Name** | **Description** |
|:--|:--|
| `repo-token` | The GitHub access token to use to create a Pull Request for any SDK update to the repository. |

### Optional

| **Name** | **Description** | **Default** |
|:--|:--|:--|
| `branch-name` | The optional Git branch name to use. | - |
| `channel` | The optional .NET release channel to download the SDK for (2.1, 3.1, 5.0, etc.). | The channel derived from the current SDK version. |
| `commit-message` | The optional Git commit message to use. | - |
| `global-json-file` | The optional path to the global.json file to update the SDK for. | `./global.json` |
| `user-email` | The optional email address to use for the Git commit. | `github-actions[bot]@users.noreply.github.com` |
| `user-name` | The optional user name to use for the Git commit. | `github-actions[bot]` |
| `dry-run` | If true, the action will not push changes to GitHub. | `false` |

## Outputs

| **Name** | **Description** |
|:--|:--|
| `pull-request-number` | The number of the Pull Request created by the action if the .NET SDK is updated. |
| `pull-request-html-url` | The HTML URL of the Pull Request created by the action if the .NET SDK is updated. |
| `sdk-updated` | Whether the .NET SDK was updated by the action. |
| `sdk-version` | The latest version of the .NET SDK for the specified channel when the action completed. |

## Feedback

Any feedback or issues can be added to the issues for this project in [GitHub](https://github.com/martincostello/update-dotnet-sdk/issues).

## Repository

The repository is hosted in [GitHub](https://github.com/martincostello/update-dotnet-sdk): https://github.com/martincostello/update-dotnet-sdk.git

## License

This project is licensed under the [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt) license.
