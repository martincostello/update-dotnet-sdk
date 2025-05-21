When any files in `src` are changed or if `package.json` is modified, run `npm run publish` to regenerate the files in `dist` and ensure any changes to those files are committed.

Ensure that any new files that are added to `src` or `tests` end in a new line, as specified in the `.editorconfig` configuration.

Jest is used for tests.

Prefer data-driven tests over multiple individual test cases where relevant.
