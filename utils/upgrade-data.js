var fs = require("fs");
var path = require("path");

var async = require("async");
var mongoose = require("mongoose");
var ArgumentParser = require("argparse").ArgumentParser;

// Load in ENV variables
require("dotenv").load();

mongoose.connect(process.env.MONGO_URL);

// ARG PARSER
var argparser = new ArgumentParser({
    version: "0.0.1",
    addHelp: true
});

argparser.addArgument(["--user"], {
    help: "The user ID to use to authenticate with Idyll.",
    defaultValue: process.env.IDYLL_USER,
    dest: "user"
});

argparser.addArgument(["cropDataDir"], {
    help: "The directory holding the MongoDB export json files from Idyll."
});

var args = argparser.parseArgs();

var images = require(path.resolve(args.cropDataDir, "images.json"));
var selections = require(path.resolve(args.cropDataDir, "selections.json"));

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

var userID = args.user;
var jobs = {};
var tasks = [];
var results = [];

async.eachSeries(images, function(image, callback) {
    var match = /^([^\/]+)\/(.*)$/.exec(image.scaled.file);
    var source = match[1];
    var file = match[2];

    if (!(source in jobs)) {
        jobs[source] = new Job({
            _id: source + "-crop",
            creator: userID,
            name: source + " crop",
            type: "image-select"
        });
    }

    var job = jobs[source];

    var task = new Task({
        creator: userID,
        job: job._id,
        assigned: [],
        files: [{
            name: file,
            type: "image/jpeg",
            path: "http://data.ukiyo-e.org/" + source + "/images/" + file,
            data: {
                width: image.scaled.width,
                height: image.scaled.height
            }
        }]
    });

    var matchedSelections = [];

    var selectionIDs = image.selections.map(function(item) {
        return item.$oid;
    });

    for (var i = 0; i < selections.length; i++) {
        var id = selections[i]._id.$oid;

        if (selectionIDs.indexOf(id) >= 0) {
            matchedSelections.push(selections[i]);
        }
    }

    matchedSelections.forEach(function(selection) {
        var result = new Result({
            task: task._id,
            user: userID,
            started: new Date(selection.started.$date),
            completed: new Date(selection.completed.$date),
            results: selection.selections.map(function(selection) {
                return {
                    height: selection.height,
                    width: selection.width,
                    x: selection.x,
                    y: selection.y
                };
            })
        });

        task.results.push(result._id);
        results.push(result);

        console.log("Making result", result._id);
    });

    console.log("Saving task:", task._id);
    task.save(callback);

}, function(err) {
    if (err) {
        console.error(err);
    }

    console.log("Saving jobs...", Object.keys(jobs).length);
    async.eachSeries(Object.keys(jobs), function(jobName, callback) {
        jobs[jobName].save(callback);
    }, function(err) {
        if (err) {
            console.error(err);
        }

        console.log("Saved.");
        console.log("Saving results...", results.length);

        async.eachSeries(results, function(result, callback) {
            result.save(callback);
        }, function(err) {
            if (err) {
                console.error(err);
            }

            console.log("Finished.");
            process.exit(0);
        });
    });
});