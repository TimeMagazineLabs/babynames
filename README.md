# Baby Names!

v0.1.1

[![Build Status](https://travis-ci.org/TimeMagazine/babynames.svg)](https://travis-ci.org/TimeMagazine/babynames)

Fun with the Social Security Administration's [baby name data](http://www.ssa.gov/OACT/babynames/).

## Setup

This is a Node.js script, so you should consider [downloading Node](http://nodejs.org/) before attempting to run it.

To download the repo, simply clone it:

	git clone https://github.com/TimeMagazine/babynames.git
	cd babynames

Then install the dependencies:

	npm install

## The Data 

The Social Security Administration organizes the baby name data, somewhat inconveniently, as year-by-year text files named `yob[year].txt`, beginning in 1880 for national data and 1910 for state data. The data for the previous calendar year is usually released around Mother's Day.

As of the 2018 data, there are 109,174 names, constituting any name-gender combination that appeared in at least one year a minimum of five times. The scripts in this repo download this raw data and provide tools for aggregating specific (or all) names in specific (or all) spans of years will the ability to exclude uncommon names.

### Getting the Data

The raw data is not included in the repo. Instead, you need to download it from the [Social Security Administration](http://www.ssa.gov/OACT/babynames/) with a simple command or function. This script will download and unzip it for you into the [`data/national`](data/national) directory, and then delete the `.zip` file.

	# CLI
	./index.js download 

	# Node
	const babynames = require("babynames");
	babynames.download({ [opts] }, function() {
		// further commands to aggregate the flat files you just downloaded
	});

You can also get the state-by-state data, which extracts to the [`data/states`](data/states) directory

	# CLI
	./index.js download --states

	# Node
	const babynames = require("babynames");
	babynames.download({ states: true }, function() { ... });

### Total babies born each year

There is also a file called `data/totals.json` with data on the total number of babies born (or at least, those issued a SSN) each year, [per the SSA](http://www.ssa.gov/oact/babynames/numberUSbirths.html), which is used for calculating frequencies as percentages. This is necessary because the totals are higher than the sum of each name in the name files, which don't include names that occur fewer than five times.

If you want to re-download this data--maybe it's a new year or you suspect there has been a revision--just run `./scripts/total_births.js`, which will scrape the page on the SSA website and overwrite the file in the repo.

### Let's get started!

Now that you've downloaded the raw data, the fun begins!

## Extracting names

Once you've downloaded the data, you can aggregate it on a per-name basis and store it in a variety of formats:

	./index.js store --format=json --names=Edward,Nancy,Christopher

### Options

These options are either passed as `--format`, e.g. from the command-line, or as key values in Node (see [test/test.js](test/test.js))

| option | default | purpose |
| -------- | --------- | ---------- |
| `names` | `null`: Every name! | A comma-separated list of names to extract. If you don't append a name with `-f` or `-m`, it will search for both genders.|
| `start` | `1880` | The first year of data to extract. The default, `1880`, is the first available year of data. |
| `end` | Most recent year |  The last year of data to extract. The default is the previous calendar year starting in June, otherwise the year before that. |
| `min` | `1` | Don't include names that don't show up at least this many times in at least one year. The default is functionally `5` in the data. |
| `cutoff` | `1` | Don't include names that don't show up in at least this many individual years. |
| `format` | Must be provided | Format out output. Options are `json`, `csv`, `jsonp`, `csvs`, `mongodb`. See following explanation. |

#### Formats
+ `json`: Each name is stored as an individual JSON file in the `/flat_files/individual/` directory.
+ `jsonp`: Each name is stored as an individual JSON-P file in the `/flat_files/individual/` directory. It is wrapped in a callback function named `name_callback` by default, which you can override with `opts.callback` or `--callback`.
+ `csv`: All names are packaged into one CSV file and stored in `/flat_files/names_[year_start]_[year_end].csv/`. This file will be able 30MB if you don't include limiting specifications above (`start`, `end`, `min`, `cutoff`).
+ `csvs`: Each name is stored as an individual CSV file in the `/flat_files/individual/` directory.
+ `mongodb`: All names are inserted into a MongoDB instance, using the slug `[name]-[m|f]` as the `_id`. *Note:* Because this is optional, the [mongodb](https://www.npmjs.org/package/mongodb) Node module is not included as a dependency, so you'll need to install it yourself as well as running a mongo server: `npm install mongodb`. You can pass a `--mongo_uri` argument, which defaults to `mongodb://localhost:27017`, as well as a `db_name` argument, which defaults to `babynames`.

### How it Works

First, the script reads every raw file from the SSA and stores the data on a per-name basis in memory. For each name, it records both the absolute number of babies with that name in a given year and the percentage of all babies of the same gender with that name. The denominator in that calculation is the gender-specific total number of babies [as reported on SSA.gov](http://www.ssa.gov/oact/babynames/numberUSbirths.html), NOT the calculated sum of all baby name frequencies (which will be lower than the actual number of children born in the United States, given that the data only counts names that appear at least five times). For JSON, the years are stored as keys in an object for fast retrieval. Here is the output of `./index.js store --name=Clifford-m --format=json --start=1960 --end=1980`, which would be writting to `flat_files/individuals/clifford-m.json`:

	{
	  "id": "clifford-m",
	  "name": "Clifford",
	  "gender": "M",
	  "values": {
	    "1960": 2465,
	    "1961": 2336,
	    "1962": 2183,
	    "1963": 2198,
	    "1964": 2021,
	    "1965": 1822,
	    "1966": 1612,
	    "1967": 1514,
	    "1968": 1608,
	    "1969": 1507,
	    "1970": 1581,
	    "1971": 1382,
	    "1972": 1268,
	    "1973": 1175,
	    "1974": 1148,
	    "1975": 1124,
	    "1976": 1065,
	    "1977": 973,
	    "1978": 1002,
	    "1979": 1046,
	    "1980": 1218
	  },
	  "percents": {
	    "1960": 0.00113831417748373,
	    "1961": 0.0010835080428208315,
	    "1962": 0.001038538187329834,
	    "1963": 0.0010643861620113896,
	    "1964": 0.0009969135634998424,
	    "1965": 0.0009614400281994266,
	    "1966": 0.0008867579315876157,
	    "1967": 0.0008507089990852349,
	    "1968": 0.0009054069348090115,
	    "1969": 0.0008235737746129422,
	    "1970": 0.0008297069733171276,
	    "1971": 0.0007600414008079977,
	    "1972": 0.0007571952960735124,
	    "1973": 0.0007279201679110487,
	    "1974": 0.0007039861066992741,
	    "1975": 0.0006925348562528072,
	    "1976": 0.0006520884587077995,
	    "1977": 0.0005690371283567635,
	    "1978": 0.0005862398622043789,
	    "1979": 0.0005837441214009189,
	    "1980": 0.0006565602388628679
	  }
	}

## Analysis

**This is still in the works**

The `store` script comes with several options for basic analysis:

+ `normalize`: Add a third property to each name that is the normalized value for the percentage figures, such that the peak percentage year is 1.
+ `peak`: Find the peak value and year for both raw values and percents
+ `maxima`: Identify all the local maxima -- points where every value 5 years before and after is lower. Only counts maxima that are at least 25 percent of peak value.
+ `dense`: If a name does not appear in a year in the range specified between `start` and `end`, list that year in the data as `0`. Otherwise it is not included at all (a "sparse" format).

## Extras
We've now got British baby names going back to 1996, accessed on Oct. 5, 2016 from the U.K. [Office for National Statistics](http://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/adhocs/006073babynames1996to2015). The total number of live births was downloaded [here](http://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/datasets/birthsummarytables) from the same source.

## License

This script is provided free and open-source by Time under the MIT license. If you use it, you are politely encouraged to acknowledge Time and link to this page.

The dictionary file [dict/2of12.txt](dict/2of12.txt) is from the [12 Dicts project](http://wordlist.aspell.net/12dicts-readme/), which is in the public domain.
