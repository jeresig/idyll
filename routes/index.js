var async = require("async");
var mongoose = require("mongoose");
var appcache = require("appcache-glob");

var User = mongoose.model("User");
var Job = mongoose.model("Job");
var Data = mongoose.model("Data");
var Result = mongoose.model("Result");

var cacheSize = 200;

// Load Appcache
var baseAppCache = appcache
    .create({cwd: __dirname + "/../public"})
    .addCache([
        "/bower/jquery/jquery.min.js",
        "/bower/bootstrap/dist/css/bootstrap.min.css",
        "/bower/bootstrap/dist/fonts/*",
        "/js/*",
        "/css/*",
        "/mobile"
    ])
    .addNetwork(["/", "/selections", "/queue"]);

exports.index = function(req, res) {
    res.render('index');
};

exports.mobile = function(req, res) {
    res.render('index', {offline: true});
};

var getAndAssignTask = function(req, callback) {
    var user = req.user;

    Task.find({assigned: user}, function(err, tasks) {
        if (err) {
            return callback(err);
        }

        var num = cacheSize - tasks.length;

        if (num <= 0) {
            return callback(null, tasks);
        }

        Data.where("assigned").size(0)
            .where("results").size(0)
            .limit(num)
            .exec(function(err, additional) {
                if (err) {
                    return callbac(err);
                }

                additional.forEach(function(task) {
                    task.assigned.push(user);
                    task.save();
                    tasks.push(task);
                });

                // If nothing left look for things that are
                // incomplete and we're not assigned to.
                num = cacheSize - tasks.length;

                if (num <= 0) {
                    return callback(null, tasks);
                }

                Data.where("assigned").ne(user)
                    .where("results").size(0)
                    .limit(num)
                    .exec(function(err, additional) {
                        additional.forEach(function(task) {
                            task.assigned.push(user);
                            task.save();
                            tasks.push(task);
                        });
                        
                        callback(null, tasks);
                    });
            });
    });
};

exports.imageQueue = function(req, res) {
    getAndAssignTasks(req, function(err, tasks) {
        res.send(200, {
            tasks: tasks.map(function(task) {
                return task._id; // TODO: Change this
            })
        });
    });
};

// TODO: Remove cache stuff
exports.appCache = function(req, res) {
    var cache = baseAppCache.clone();

    getAndAssignTasks(req, function(err, tasks) {
        tasks.forEach(function(task) {
            cache.addCache("/images/scaled/" + task.scaled.file);
        });

        cache.pipe(res);
    });
};

// TODO: saveResults
exports.saveSelections = function(req, res) {
    var data = req.body;
    var user = req.user;
    var files = Object.keys(data.selections);

    async.eachLimit(files, 5, function(file, callback) {
        // TODO: Make this more flexible.
        var fileName = file.replace("/images/scaled/", "");

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