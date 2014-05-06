babynames
=========

Fun with the Social Security Administration's baby name data

#Setup

This is a Node.js script, so you should consider [downloading Node](http://nodejs.org/) before attempting to run it.

To download the repo, simply clone it:

	git clone https://github.com/TimeMagazine/babynames.git

Then install the dependencies:

	npm install

This script will automatically download and unzip the Social Security Administration's most recent data file for you if you ask it to:

	./index.js download 

Once that's done, you can aggregate the data to a per-name basis and store it in a variety of formats:

	./index.js store --format=json

Your choices are:

+ `json`: Each name is stored as an individual JSON file in the `/flat/individual/` directory.
+ `jsonp`: Each name is stored as an individual JSON-P file in the `/flat/individual/` directory. It is wrapped in a callback function named `ticallback` by default, which you can override with `opts.callback`.
+ `csvs`: Each name is stored as an individual CSV file in the `/flat/individual/` directory.
+ `csv`: All names are packaged into one CSV file and stored in `/flat/names.csv/`. This file will be able 30MB if you don't include limiting specifications (below).
+ `mongodb`: All names are inserted into a MongoDB instance. You are responsive for running a Mongo server at `localhost:27017`

There are also a variety of options for reducing the scope of the names.

+ `start`: Don't retrieve years before this year. Ex: `--start=1950`. Default is `1880`, the first year of the data.
+ `end`: Don't retrieve years after this year. Ex: `--end=2000`. Default is the present year.
+ `min`: Don't include names that don't show up at least this many time in at least one year. Ex: `--min=25`. Default is `0`.
+ `cutoff`: Don't include names that don't show up in at least this many individual years. Ex: `--cutoff=50`. Default is `0`.
+ `dense`: If a name does not appear in a year in the range specified between `start` and `end`, list that year in the data as `0`. Otherwise it is not included at all (a "sparse" format).

