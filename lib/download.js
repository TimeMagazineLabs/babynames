const fs = require("fs");
const log = require("npmlog");
const AdmZip = require("adm-zip");
const request = require("request");

module.exports = function(opts, callback) {
	if (opts.dataset == "states") {
		downloadZipFile("https://www.ssa.gov/oact/babynames/state/namesbystate.zip", "namesbystate.zip", opts, callback);
	} else {
		downloadZipFile("http://www.ssa.gov/OACT/babynames/names.zip", "names.zip", opts, callback);
	}
}

function downloadZipFile(url, filename, opts, callback) {
	// download zip file of data
	if (fs.existsSync(filename)) {
		log.info("Already have " + filename + " downloaded. Unzipping to ./data");
		unzip();
		return;
	}

	log.info("Downloading " + filename + " from " + url);

	request(url)
		.pipe(fs.createWriteStream(filename))
		.on('close', function () {
			console.log('File downloaded!');
			unzip();
		});	

	function unzip() {
		let zip = new AdmZip(filename);
		if (opts.dataset == "states") {
			zip.extractAllTo("./data/states");
		} else {
			zip.extractAllTo("./data/national");
		}

		if (!opts || !opts.cache) {
			fs.unlink(filename, function() {
				log.info("Finished unzipping. Deleted " + filename);
				if (callback) {
					callback();
				}		
			});
		} else {
			log.info("Finished unzipping.");	
			if (callback) {
				callback();
			}		
		}
	}
}