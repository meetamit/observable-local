# observable-local

## TODO

- [ ] Turn it into installable npm
- [ ] README.md
- [ ] Executable for running from `node_modules/.bin`
- [ ] require a `.writable-notebook-views` file in the views directory, for safety
- [ ] Commandline args `--notebooks` and `--views`
- [ ] MAYBE: optionally webpack notebooks into bundles

#### Bugs

- [x] Guard against server crashes caused by error with `filepath.match(/notebooks\/([^.]*)(\.js)?/)[1]`
- [x] Either rebuild (non-minified) `@observablehq/notebook-inspector` with proper utf-8 charset, OR just replace with minified npm-installed build
