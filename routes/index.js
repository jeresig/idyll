var async = require("async");
var mongoose = require("mongoose");
var appcache = require("appcache");

var User = mongoose.model("User");
var Image = mongoose.model("Image");
var Selection = mongoose.model("Selection");

var cacheSize = 200;

// Load Appcache
var baseAppCache = appcache
    .create({cwd: __dirname + "/../public"})
    .addCache([
        "bower/jquery/jquery.min.js",
        "bower/bootstrap/dist/css/bootstrap.min.css",
        "bower/bootstrap/dist/fonts/*",
        "js/*",
        "css/*",
        "/mobile"
    ])
    .addNetwork(["/", "/selections", "/queue"]);

exports.index = function(req, res) {
    res.render('index');
};

exports.mobile = function(req, res) {
    res.render('index', {offline: true});
};

var getAndAssignImages = function(req, callback) {
    var user = req.user;

    Image.find({assigned: user}, function(err, images) {
        if (err) {
            return callback(err);
        }

        var num = cacheSize - images.length;

        if (num <= 0) {
            return callback(null, images);
        }

        Image.where("assigned").size(0)
            .where("selections").size(0)
            .limit(num)
            .exec(function(err, additional) {
                if (err) {
                    return callbac(err);
                }

                additional.forEach(function(image) {
                    image.assigned.push(user);
                    image.save();
                    images.push(image);
                });

                // If nothing left look for things that are
                // incomplete and we're not assigned to.
                num = cacheSize - images.length;

                if (num <= 0) {
                    return callback(null, images);
                }

                Image.where("assigned").ne(user)
                    .where("selections").size(0)
                    .limit(num)
                    .exec(function(err, additional) {
                        additional.forEach(function(image) {
                            image.assigned.push(user);
                            image.save();
                            images.push(image);
                        });
                        
                        callback(null, images);
                    });
            });
    });
};

exports.imageQueue = function(req, res) {
    getAndAssignImages(req, function(err, images) {
        res.send(200, {
            images: images.map(function(image) {
                return image.scaled;
            })
        });
    });
};

exports.appCache = function(req, res) {
    var cache = baseAppCache.clone();

    getAndAssignImages(req, function(err, images) {
        images.forEach(function(image) {
            cache.addCache("images/scaled/" + image.scaled.file);
        });

        cache.pipe(res);
    });
};

exports.saveSelections = function(req, res) {
    var data = req.body;
    var user = req.user;
    var files = Object.keys(data.selections);

    async.eachLimit(files, 5, function(file, callback) {
        // TODO: Make this more flexible.
        var fileName = file.replace("images/scaled/", "");

        Image.findOne({"scaled.file": fileName}, function(err, image) {
            if (err || !image) {
                return callback(err);
            }

            var selection = new Selection(data.selections[file]);
            selection.user = user;
            selection.image = image;
            selection.save(function(err) {
                // The image is no longer assigned to the user.
                // TODO: If we want a minimum number of selections before
                // closing we should change this logic.
                image.assigned = [];
                image.selections.push(selection);
                image.save(callback);
            });
        });
    }, function(err, images) {
        if (err) {
            res.send(500, {error: "Error saving selections."});
        } else {
            exports.imageQueue(req, res);
        }
    });
};