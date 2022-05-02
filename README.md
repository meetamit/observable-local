# observable-local

Observable local lets you author and run [ObservableHQ](https://observablehq.com) notebooks locally on your own machine. An observable-local notebook is made up of cells (aka variables) just like on ObservableHQ, with the output of one cell being available for use in another. When you edit a notebook locally, you get the benefit of being able to edit a single cell and having **only** its dependent cells rerun. Unlike on ObservableHQ, observable-local does not have UI for editing the individual cells. Instead, you author a notebook in a single .js using your text editor of choice. As such, the format of the notebook you create must use "pure" javascript syntax (whereas ObservableHQ extends the javascript syntax to allow declaring cells in a syntax similar to variables along with new keywords viewof and mutable). Even though any modification to the local notebook involves re-saving the entire .js file, observable-local examines then changes and ensures that only the modified cells and their dependent cells get re-run. 

To learn about the proper syntax for authoring observable-local notebooks, it's best to just download the source code of a notebook that you're familiar with on ObservableHQ and view or run it with observable-local. For example, consider this [intro to observable notebook](https://observablehq.com/@observablehq/five-minute-introduction) whose URL is:

    https://observablehq.com/@observablehq/five-minute-introduction

The raw, underlying javascript of this notebook, **which is runnable by observable-local** can be obtained via the ObservableHQ api by changing the URL to

    https://api.observablehq.com/@observablehq/five-minute-introduction.js

I.e. you need to prepend `api` as a subdomain and append `.js` to the notebook name.

If you were to paste that code into a local js file and load it in observable-local, you should expect the same results as on ObservableHQ but with a somewhat different presentation.

# Getting started

`npm install observable-local`

After npm-installing, run the following command in a terminal:

`observable-local serve`

You can now put notebook .js files in the `/notebooks` directory of the installed NPM module. You may also specify a different local directory of your choice, and the notebooks will be served from there instead. To learn more about that and other options, run

`observable-local -h`


## TODO

- [ ] Further documentation of notebook syntax in README.md
- [ ] require a `.writable-notebook-views` file in the views directory, for safety
- [ ] MAYBE: optionally Rollup notebooks into bundles
- [ ] MAYBE: split Runner into Presenter and Sync'er??
- [ ] set additional builtins (e.g. d3, vega)
- [ ] custom-resolve modules
- [ ] custom css (page max width, classes that can be applied to cells)
