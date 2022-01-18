#!/usr/bin/env node

var babynames = require("../index");

// equivalent on CLI of ./index.js download
babynames.download({}, function() {
	babynames.store({
		names: "Alex,Cameron",
		format: "csv",
		min: 25,
		end: 1950,
		peaks: true		
	});

	babynames.store({
		names: "Christopher,Catharine,Catherine,Sydney",
		format: "json",
		normalize: true,
		peaks: true
	});

	babynames.store({
		names: "Martin,Samuel",
		format: "csvs",
		normalize: true
	});
});


