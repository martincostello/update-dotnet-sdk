# Update .NET SDK

This action updates the .NET SDK version specified by a `global.json` file stored in a GitHub repository.

## Example Usage

```yml
steps:
- uses: actions/checkout@v2
- uses: martincostello/update-dotnet-sdk@v1
  with:
    channel: '3.1'
    repo-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| **Name** | **Required** | **Description** | **Default** |
|:--|:-:|:--|:--|
| `channel` | Yes | The .NET release channel to download the SDK for (2.1, 3.1, 5.0, etc.). | - |
| `repo-token` | Yes | The GitHub access token to use to create a Pull Request for any SDK update to the repository. | - |
| `branch-name` | No | The optional Git branch name to use. | - |
| `commit-message` | No | The optional Git commit message to use. | - |
| `global-json-file` | No | The optional path to the global.json file to update the SDK for. | `./global.json` |
| `user-email` | No | The optional email address to use for the Git commit. | `github-actions[bot]@users.noreply.github.com` |
| `user-name` | No | The optional user name to use for the Git commit. | `github-actions[bot]` |
| `dry-run` | No | If true, the action will push changes to GitHub. | `false` |

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
