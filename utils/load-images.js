var fs = require("fs");
var path = require("path");

var async = require("async");
var glob = require("glob");
var request = require("request");
var imageinfo = require("imageinfo");
var ArgumentParser = require("argparse").ArgumentParser;

var argparser = new ArgumentParser({
    description: "Create an Idyll job and tasks based " +
        "upon a directory of images.",
    addHelp: true
});

argparser.addArgument(["--user"], {
    help: "The user ID to use to authenticate with Idyll.",
    defaultValue: process.env.IDYLL_USER,
    dest: "user"
});

argparser.addArgument(["--token"], {
    help: "The token to use to authenticate with Idyll.",
    defaultValue: process.env.IDYLL_TOKEN,
    dest: "token"
});

argparser.addArgument(["--job-id"], {
    help: "The ID of the Job to use.",
    required: true,
    dest: "jobID"
});

argparser.addArgument(["--job-name"], {
    help: "The name of the job to create.",
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

var createJob = function(callback) {
    request.post({
        url: args.server + "/jobs",
        json: true,
        body: {
            user: args.user,
            token: args.token,
            data: {
                id: args.jobID,
                name: args.jobName,
                description: args.jobDesc,
                type: args.jobType
            }
        }
    }, function(err, res, job) {
        if (err || !job || job.error) {
            console.error("Error creating job.");
            console.error(err || job.error);
            return;
        }

        callback(null, args.jobID);
    });
};

var createTasks = function(err, jobID) {
    console.log("Loading images into DB...");

    var files = glob.sync(path.resolve(args.imageDir) + "/*.jpg");

    console.log("Directory:", args.imageDir);
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
                url: args.server + "/jobs/" + jobID + "/tasks",
                json: true,
                body: {
                    user: args.user,
                    token: args.token,
                    data: {
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
                }
            }, function(err) {
                if (err) {
                    console.error("Error saving:", fileName);
                    console.error(err);
                } else {
                    console.log("Saved:", fileName);
                }
                callback(err);
            });
        });
    }, function(err) {
        console.log("DONE");
        process.exit(0);
    });
};

if (args.jobName) {
    createJob(createTasks);
} else {
    createTasks(null, args.jobID);
}