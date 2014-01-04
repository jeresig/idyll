var fs = require("fs");
var path = require("path");
var async = require("async");
var glob = require("glob");
var imageinfo = require("imageinfo");
var mongoose = require("mongoose");

var env = process.env.NODE_ENV || "development";
var config = require(__dirname + "/../config/config")[env];
var mongoURL = process.env.MONGO_URL || config.db;

mongoose.connect(mongoURL);

require(__dirname + "/../app/models/image");
var Image = mongoose.model("Image");

console.log("Loading images into DB...");

var publicImages = "public/images";
var scaledPath = publicImages + "/scaled/";
var scaledDir = path.resolve(__dirname, "..", scaledPath);
var files = glob.sync(scaledDir + "/**/*.jpg");

console.log("Directory:", scaledDir);
console.log("# of files found:", files.length);

async.eachLimit(files, 5, function(file, callback) {
    var fileName = file.replace(scaledDir + "/", "");

    Image.findOne({"scaled.file": fileName}, function(err, image) {
        if (image) {
            // Already loaded!
            return callback();
        }

        fs.readFile(file, function(err, data) {
            if (err) {
                console.log("Error reading:", file);
                callback(err);
            } else {
                var dimensions = imageinfo(data);
                Image.create({
                    scaled: {
                        file: fileName,
                        width: dimensions.width,
                        height: dimensions.height
                    }
                }, function(err, image) {
                    console.log("Saved:", fileName);
                    callback(err, image);
                });
            }
        });
    });
}, function(err) {
    console.log("DONE");
    process.exit(0);
});
