#!/usr/bin/env node

var babynames = require("../index");

babynames.store({
	names: "Christopher,Susan",
	format: "csv",
	peaks: true,
	min: 25
});

babynames.store({
	names: "Alex,Lothar",
	format: "json",
	normalize: true,
	end: 1990
});

babynames.store({
	names: "Martin,Samuel",
	format: "csvs",
	start: 1950
});