var fs = require("fs");
var path = require("path");

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

var Task = mongoose.model("Task");

// ARG PARSER
var parser = new ArgumentParser({
    version: "0.0.1",
    addHelp: true
});

parser.addArgument(["--imagesDir"], {
    help: "The directory in which the images are stored, to prefix the output.",
    action: "store"
});

parser.addArgument(["jobName"], {
    help: "The name of the job from which to pull the images."
});

var args = parser.parseArgs();

Task.find({
    job: args.jobName,
    // Equivalent to $size > 0
    "results.0": {$exists: true}
})
.populate("results")
.stream()
.on("data", function(task) {
    var result = task.results[0];

    if (result.results.length === 0) {
        var fileName = task.files[0].name;

        if (args.imagesDir) {
            fileName = path.resolve(args.imagesDir, fileName);
        }

        console.log(fileName);
    }
})
.on("close", function() {
    process.exit(0);
});