var async = require("async");
var mongoose = require("mongoose");
var appcache = require("appcache");

var User = mongoose.model("User");
var Image = mongoose.model("Image");
var Selection = mongoose.model("Selection");

var cacheSize = 200;

// Load Appcache
var baseAppCache = appcache
    .create({cwd: __dirname + "/public"})
    .addCache(["js/*", "css/*"])
    .addNetwork(["/", "/selections"]);

exports.index = function(req, res) {
    res.render('index');
};

exports.mobile = function(req, res) {
    res.render('index', {offline: true});
};

exports.appCache = function(req, res) {
    var cache = baseAppCache.clone();

    getUser(req.query.name || "John Resig", function(err, user) {
        Image.find({assigned: user._id}, function(err, images) {
            var num = cacheSize - images.length;
            Image.where("assigned").size(0).limit(num)
                .exec(function(err, additional) {
                    additional.forEach(function(image) {
                        image.assigned.push(user._id);
                        image.save();
                        images.push(image);
                        cache.addCache(
                            "images/scaled/" + image.scaled.file);
                    });

                    cache.pipe(res);
                });
        });
    });
};

var getUser = function(name, callback) {
    User.findOne({name: name}, function(err, user) {
        if (!err && user) {
            callback(null, user);
        } else {
            User.create({name: name}, callback);
        }
    });
};

exports.saveSelections = function(req, res) {
    var data = req.body;

    getUser(data.user, function(err, user) {
        var files = Object.keys(data.selections);

        async.eachLimit(files, 5, function(file, callback) {
            // TODO: Make this more flexible.
            var fileName = file.replace("images/scaled/", "");

            Image.findOne({"scaled.file": fileName}, function(err, image) {
                if (err || !image) {
                    return callback(err);
                }

                var selectionData = data.selections[file];
                selectionData.user = user;
                selectionData.image = image;
                Selection.create(selectionData, callback);
            });
        }, function(err, images) {
            if (err) {
                res.send(500, "Error saving selections.");
            } else {
                res.send(200, "Selections saved successfully.");
            }
        });
    });
};