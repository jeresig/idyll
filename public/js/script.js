var readData = function() {
	return JSON.parse(window.localStorage["crop-data"] || "{}");
};

var writeData = function(data) {
	window.localStorage["crop-data"] = JSON.stringify(data);
};

var allFiles = [];

var start = function() {
	var data = readData();

	console.log(data);
};

$.get("/public/data/images.txt", function(files) {
	allFiles = files.split(/\n/);
	start();
});