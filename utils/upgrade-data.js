var fs = require("fs");
var path = require("path");

var async = require("async");
var mongoose = require("mongoose");
var ArgumentParser = require("argparse").ArgumentParser;

// ARG PARSER
var parser = new ArgumentParser({
    version: "0.0.1",
    addHelp: true
});

parser.addArgument(["cropDataDir"], {
    help: "The directory holding the MongoDB json files from Idyll."
});
var args = parser.parseArgs();

var BASE_DATA_DIR = path.resolve(process.env.BASE_DATA_DIR, args.source);

var imagesDir = path.resolve(BASE_DATA_DIR, "images");
var scaledDir = path.resolve(BASE_DATA_DIR, "scaled");
var thumbsDir = path.resolve(BASE_DATA_DIR, "thumbs");
var croppedDir = path.resolve(BASE_DATA_DIR, "cropped");

var images = require(path.resolve(args.cropDataDir, "images.json"));
var selections = require(path.resolve(args.cropDataDir, "selections.json"));

// Load models
var modelsDir = path.resolve(__dirname, "../app/models");

fs.readdirSync(modelsDir).forEach(function (file) {
    if (~file.indexOf(".js")) {
        require(modelsDir + "/" + file);
    }
});

var Job = mongoose.model("Job");
var Result = mongoose.model("Result");
var Task = mongoose.model("Task");
var User = mongoose.model("User");

var userID = "creator";
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

    var selections = [];

    var selectionIDs = image.selections.map(function(item) {
        return item.$oid;
    });

    for (var i = 0; i < selections.length; i++) {
        var id = selections[i]._id.$oid;

        if (selectionIDs.indexOf(id) >= 0) {
            selections.push(selections[i]);
        }
    }

    var result;

    if (selections.length > 0) {
        result = new Result({
            task: task._id,
            user: userID,
            started: selection.started,
            completed: selection.completed,
            results: selections.map(function(selection) {
                return {
                    height: selection.height,
                    width: selection.width,
                    x: selection.x,
                    y: selection.y
                };
            })
        });

        task.results.push(result._id);
    }

    console.log("Saving task:", task._id);
    //task.save(callback);
    callback();
}, function() {
    console.log("Saving jobs...");
    async.eachSeries(Object.keys(jobs), function(jobName, callback) {
        //jobs[jobName].save(callback);
        callback();
    }, function() {
        console.log("Saved.");
        console.log("Saving results...");

        async.eachSeries(results, function(result, callback) {
            //result.save(callback);
            callback();
        }, function() {
            console.log("Finished.");
            process.exit(0);
        });
    });
});