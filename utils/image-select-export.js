var fs = require("fs");
var path = require("path");

var gm = require("gm");
var async = require("async");
var mongoose = require("mongoose");
var ArgumentParser = require("argparse").ArgumentParser;

// Load in ENV variables
require("dotenv").load();

mongoose.connect(process.env.MONGO_URL);

// Load models
var modelsDir = path.resolve(__dirname, "../server/app/models");

fs.readdirSync(modelsDir).forEach(function (file) {
    if (~file.indexOf(".js")) {
        require(modelsDir + "/" + file);
    }
});

var Job = mongoose.model("Job");
var Result = mongoose.model("Result");
var Task = mongoose.model("Task");
var User = mongoose.model("User");

// ARG PARSER
var parser = new ArgumentParser({
    version: "0.0.1",
    addHelp: true
});

parser.addArgument(["--full"], {
    help: "A directory of full-size images to use as source material.",
    dest: "fullSizeDir"
});

parser.addArgument(["--square"], {
    help: "Attempt to square off all of the images, as best as possible.",
    action: "storeTrue"
});

parser.addArgument(["--crop"], {
    help: "Create a single cropped version of the image.",
    action: "storeTrue"
});

parser.addArgument(["--negative"], {
    help: "Generate a number of negative crops for each image (if possible).",
    action: "storeConst"
});

parser.addArgument(["outputDir"], {
    help: "The directory to which the new images will be written."
});

parser.addArgument(["imagesDir"], {
    help: "The directory holding the images that'll be used as a data source."
});

parser.addArgument(["jobName"], {
    help: "The name of the job from which to pull the images."
});

var args = parser.parseArgs();

var imagesDir = path.resolve(args.imagesDir);
var outputDir = path.resolve(args.outputDir);

var areaOverlap = function(area1, area2) {
    if (area1.x > area2.x + area2.width || area2.x > area1.x + area1.width) {
        return false;
    }

    if (area1.y < area2.y + area2.height || area2.y < area1.y + area1.height) {
        return false;
    }

    return true;
};

Task.find({
    job: args.jobName,
    // Equivalent to $size > 0
    "results.0": {$exists: true}
})
.populate("results")
.stream()
.on("data", function(task) {
    this.pause();

    var result = task.results[0];

    if (result.results.length === 0) {
        this.resume();
        return;
    }

    var fileName = task.files[0].name;
    var filePath = path.resolve(imagesDir, fileName);

    if (args.fullSizeDir) {
        filePath = path.resolve(args.fullSizeDir, fileName);
    }

    var img = gm(filePath);
    var pos = 0;

    var crop = function(area, callback) {
        // Crop and center the image if it's not square
        var cropped = img.crop(area.width, area.height, area.x, area.y);

        // If the image has been squared, make sure we center the result
        // (will only happen if the crop is larger than the image in at
        // least one dimension)
        if (args.square) {
            cropped = cropped.gravity("Center").extent(size, size);
        }

        var outFileName = path.basename(fileName, ".jpg") +
            ".crop" + (args.crop ? "" : "." + pos) + ".jpg";
        var outputFile = path.resolve(outputDir, outFileName);

        cropped.write(outputFile, function(err) {
            if (err) {
                console.error(err);
            }
            console.log("Cropped", outFileName);
            callback();
        });
    };

    img.size(function(err, val) {
        var parts = val.split("x");

        var imgArea = {
            width: parseFloat(parts[0]),
            height: parseFlot(parts[1])
        };

        var matches = [];

        async.eachSeries(result.results, function(area, callback) {
            pos += 1;

            // Scale the width/height/x/y if we're working against the
            // full-size image instead of the scaled one
            if (args.fullSizeDir) {
                var scaledWidth = task.files[0].data.width;
                var ratio = scaledWidth / imgArea.width;
                area.width = Math.round(area.width * ratio);
                area.height = Math.round(area.height * ratio);
                area.x = Math.round(area.x * ratio);
                area.y = Math.round(area.y * ratio);
            }

            var size = Math.max(area.width, area.height);

            if (args.square && area.width !== area.height) {
                if (area.width < area.height) {
                    // We can't go wider than the image itself
                    if (area.height > imgArea.width) {
                        area.width = imgArea.width;

                    } else {
                        var lWidth = Math.floor((size - area.width) / 2);
                        var newX = Math.max(area.x - lWidth, 0);

                        // If it goes off the left side, lock it to the left
                        if (newX === 0) {
                            area.x = 0;

                        // If it goes off the right side, lock it to the right
                        } else if (newX + size > imgArea.width) {
                            area.x = imgArea.width - size;

                        // Otherwise set the new X
                        } else {
                            area.x = newX;
                        }

                        area.width = size;
                    }
                } else {
                    // We can't go taller than the image itself
                    if (size > imgArea.height) {
                        area.height = imgArea.height;

                    } else {
                        var tHeight = Math.floor((size - area.height) / 2);
                        var newY = Math.max(area.y - tHeight, 0);

                        // If it goes off the top, lock it to the top
                        if (newY === 0) {
                            area.y = 0;

                        // If it goes off the bottom, lock it to the bottom
                        } else if (newY + size > imgArea.height) {
                            area.y = imgArea.height - size;

                        // Otherwise set the new Y
                        } else {
                            area.y = newY;
                        }

                        area.height = size;
                    }
                }
            }

            matches.push(area);

            crop(area, callback);
        }, function() {
            if (!args.negative) {
                console.log("Finished:", fileName);
                this.resume();
            }

            var negMatches = [];
            var desired = parseFloat(args.negative);
            var minSize = 20;
            var attempts = 0;
            var maxAttempts = 1000;

            while (attempts < maxAttempts && negMatches.length < desired) {
                // Copy the width/height of another match, rather than attempt
                // to guess some useful dimensions
                var copyMatch = matches[Math.floor(Math.random() * matches.length)];
                var width = copyMatch.width;
                var height = copyMatch.height;

                var match = {
                    x: Math.round(Math.random() * (imgArea.width - width)),
                    y: Math.round(Math.random() * (imgArea.height - height)),
                    width: width,
                    height: height
                };

                // TODO: Check for overlap with other matches
                negMatches.push(match);
            }

            async.eachSeries(negMatches, crop, function() {
                console.log("Finished:", fileName);
                this.resume();
            }.bind(this));
        }.bind(this));
    });
})
.on("error", function() {
    
})
.on("close", function() {
    console.log("DONE");
    process.exit(0);
});