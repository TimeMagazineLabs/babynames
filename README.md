#Baby Names!

Fun with the Social Security Administration's baby name data

[![Build Status](https://travis-ci.org/TimeMagazine/babynames.png)](https://travis-ci.org/TimeMagazine/babynames)

##Setup

This is a Node.js script, so you should consider [downloading Node](http://nodejs.org/) before attempting to run it.

To download the repo, simply clone it:

	git clone https://github.com/TimeMagazine/babynames.git
	cd babynames

Then install the dependencies:

	npm install

##Data 

First, you need to get the raw data from the [Social Security Administration](http://www.ssa.gov/OACT/babynames/). This script will download and unzip it for you with the following command:

	./index.js download 

###Total babies born each year

There is also a file called `extra/totals.json` with data on the total number of babies born (or at least, those issued a SSN) each year, [per the SSA](http://www.ssa.gov/oact/babynames/numberUSbirths.html). This is useful because the totals are higher than the sum of each name in the name files, which don't include names that occur fewer than five times.

If you want to re-download the data--maybe it's a new year or you suspect there has been a revision--just run `./scripts/total_births.json`, which will scrape the page on the SSA website and overwrite the file in the repo.

###Baby names

The Social Security Administration organizes the baby name data, somewhat inconveniently, as year-by-year text files named `yob[year].txt`. The above command extracts those files to a local directory named `data/` and then deletes the zip file it downloaded. If you want to keep that zip file for some reason, just pass `--cache` to the command.

Once that's done, you can aggregate the data to a per-name basis and store it in a variety of formats:

	./index.js store --format=json

First, the script reads every file and stores the data on a per-name basis in memory. For each name, it records both the absolute number of babies with that name in a given year and the percentage of all babies of the same gender with that name. The denominator in that calculation is the gender-specific total number of babies [as reported on SSA.gov](http://www.ssa.gov/oact/babynames/numberUSbirths.html), NOT the calculated sum of all baby name frequencies (which will be lower than the actual number of children born in the United States, given that the data only counts names that appear at least five times). The years are stored as keys in an object for fast retrieval:

	{
	  "_id": "Lothar-M",
	  "name": "Lothar",
	  "gender": "M",
	  "values": {
	    "1927": 7,
	    "1928": 6,
	    "1929": 10,
	    "1931": 6,
	    "1932": 8,
	    "1935": 8,
	    "1956": 7,
	    "1959": 5,
	    "1964": 6,
	    "1968": 5
	  },
	  "percents": {
	    "1927": 0.0000062135232896167586,
	    "1928": 0.000005418551494752584,
	    "1929": 0.000009301278646775573,
	    "1931": 0.000005775539435383265,
	    "1932": 0.000007664935030094451,
	    "1935": 0.00000768623999707923,
	    "1956": 0.0000033120134297413128,
	    "1959": 0.0000023436460007087187,
	    "1964": 0.000003010349581862443,
	    "1968": 0.0000028754074452349896
	  }
	}

###Formats

Your choices are:

+ `json`: Each name is stored as an individual JSON file in the `/flat/individual/` directory.
+ `jsonp`: Each name is stored as an individual JSON-P file in the `/flat/individual/` directory. It is wrapped in a callback function named `ticallback` by default, which you can override with `opts.callback`.
+ `csvs`: Each name is stored as an individual CSV file in the `/flat/individual/` directory.
+ `csv`: All names are packaged into one CSV file and stored in `/flat/names.csv/`. This file will be able 30MB if you don't include limiting specifications (below). This preprocessed file is included in this repo.
+ `mongodb`: All names are inserted into a MongoDB instance. You are responsible for running a Mongo server at `localhost:27017` or updating the source to point to your  instance. *Note:* Because this is optional, the [mongodb](https://www.npmjs.org/package/mongodb) Node module is not listed as a dependency, you you'll need to install it yourself.

##Reducing the size
As of 2013, there are 102,691 names that show up in at least one year at least five times. Many users will not be interested in this volume of data. There are several ways to reduce the scope with command line options.

###Limit the years

+ `start`: Don't retrieve years before this year. Ex: `--start=1950`. Default is `1880`, the first year of the data.
+ `end`: Don't retrieve years after this year. Ex: `--end=2000`. Default is the present year.

###Exclude uncommon names 
+ `min`: Don't include names that don't show up at least this many time in at least one year. Ex: `--min=25`. Default is `0`.
+ `cutoff`: Don't include names that don't show up in at least this many individual years. Ex: `--cutoff=50`. Default is `0`.

##Analysis

The script comes with several options for basic analysis:

+ `normalize`: Add a third property to each name that is the normalized value for the percentage figures, such that the peak percentage year is 1.
+ `peaks`: Find the peak value and year for both raw values and percents
+ `maxima`: Identify all the local maxima -- points where every value 5 years before and after is lower. Only counts maxima that are at least 25 percent of peak value.
+ `pronunications`: See if the name is listed in the [CMU Pronouncing Dictionary](http://www.speech.cs.cmu.edu/cgi-bin/cmudict). Require that you `npm install cmudict` manually.
+ `dense`: If a name does not appear in a year in the range specified between `start` and `end`, list that year in the data as `0`. Otherwise it is not included at all (a "sparse" format).

##Types

For csv outputs, you can get the data back as either raw numbers of new babies each year with a given name (`--type=values`, which is the default) or as a percent (`--type=values`). JSON formats return both percents and values. 

##Phonemes
You can also pass a special type, `--type=phonemes`, to get back a JSON document of phoneme percents for each year for all names. By default, the script examines the first phoneme in each name. You can use `--N==TK` to aggregate around the TKth phonemes in the name. Use a negative value to start from the end.

##License

This script is provided free and open-source by Time under the MIT license. If you use it, you are politely encouraged to acknowledge Time and link to this page.

The dictionary file [dict/2of12.txt](dict/2of12.txt) is from the [12 Dicts project](http://wordlist.aspell.net/12dicts-readme/), which is in the public domain.