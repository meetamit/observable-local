# observable-local

## TODO

- [x] Turn it into installable npm
- [ ] README.md
- [x] Executable for running from `node_modules/.bin`
- [ ] require a `.writable-notebook-views` file in the views directory, for safety
- [x] Commandline args `--notebooks` and `--views`
- [ ] MAYBE: optionally Rollup notebooks into bundles
- [ ] MAYBE: split Runner into Presenter and Sync'er??

### Extendability (congif file)

- [ ] set additional builtins (e.g. d3, vega)
- [ ] custom-resolve modules
- [ ] custom css (page max width, classes that can be applied to cells)

#### Bugs

- [x] Guard against server crashes caused by error with `filepath.match(/notebooks\/([^.]*)(\.js)?/)[1]`
- [x] Either rebuild (non-minified) `@observablehq/notebook-inspector` with proper utf-8 charset, OR just replace with minified npm-installed build
