var fs = require("fs");
var path = require("path");

var async = require("async");
var glob = require("glob");
var request = require("request");
var imageinfo = require("imageinfo");
var mongoose = require("mongoose");
var ArgumentParser = require("argparse").ArgumentParser;

var argparser = new ArgumentParser({
    description: "Create an Idyll job and tasks based " +
        "upon a directory of images.",
    addHelp: true
});

argparser.addArgument(["--job-name"], {
    help: "The name of the job to create.",
    required: true,
    dest: "jobName"
});

argparser.addArgument(["--job-desc"], {
    help: "The description of the job to create.",
    defaultValue: "",
    dest: "jobDesc"
});

argparser.addArgument(["--job-type"], {
    help: "The type of job to create.",
    defaultValue: "image-select",
    required: true,
    dest: "jobType"
});

argparser.addArgument(["--image-dir"], {
    help: "Directory containing all the images you wish to add.",
    defaultValue: path.resolve("."),
    dest: "imageDir"
});

argparser.addArgument(["--url-prefix"], {
    help: "A URL prefix to use for the image.",
    dest: "urlPrefix"
});

argparser.addArgument(["--server"], {
    help: "The location of the Idyll server to add the files to.",
    defaultValue: "http://localhost:3000",
    dest: "server"
});

var args = argparser.parseArgs();

request.post({
    url: args.server + "/jobs",
    json: true
    body: {
        name: args.jobName,
        description: args.jobDesc,
        type: args.jobType
    }
}, function(err, job) {
    if (err || !job) {
        console.error("Error creating job.");
        console.error(err);
        return;
    }

    job = JSON.parse(job);

    console.log("Loading images into DB...");

    var files = glob.sync(path.resolve(args.imageDir) + "/*.jpg");

    console.log("Directory:", imageDir);
    console.log("# of files found:", files.length);

    async.eachLimit(files, 2, function(file, callback) {
        var fileName = path.basename(file);

        fs.readFile(file, function(err, data) {
            if (err) {
                console.log("Error reading:", file);
                return callback(err);
            }

            var dimensions = imageinfo(data);

            request.post({
                url: args.server + "/jobs/" + job._id + "/tasks",
                json: true,
                body: {
                    files: [
                        {
                            name: fileName,
                            type: "image/jpeg",
                            path: args.urlPrefix ?
                                args.urlPrefix + fileName : file,
                            data: {
                                width: dimensions.width,
                                height: dimensions.height
                            }
                        }
                    ]
                }
            }, function(err) {
                console.log("Saved:", fileName);
                callback(err);
            });
        });
    }, function(err) {
        console.log("DONE");
        process.exit(0);
    });
});