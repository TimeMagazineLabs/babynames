#!/usr/bin/env node

var babynames = require("../index");

babynames.download({}, function() {
	babynames.store({
		names: "Christopher,Sydney",
		format: "csv",
		peaks: true,
		min: 25
	});

	babynames.store({
		names: "Alex,Cameron",
		format: "json",
		normalize: true,
		end: 1990
	});

	babynames.store({
		names: "Martin,Samuel",
		format: "csvs",
		start: 1950
	});
});


