var async = require("async");
var mongoose = require("mongoose");
var appcache = require("appcache-glob");

var User = mongoose.model("User");
var Job = mongoose.model("Job");
var Data = mongoose.model("Data");
var Result = mongoose.model("Result");

var taskQueueSize = 200;

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
    res.render("index");
};

exports.mobile = function(req, res) {
    res.render("index", {offline: true});
};

// TODO: Have a way to get current job list
// TODO: Have a way to assign jobs

var getAndAssignTask = function(req, callback) {
    var user = req.user;

    // TODO: Limit by job ID
    Task.find({assigned: user}, function(err, tasks) {
        if (err) {
            return callback(err);
        }

        var num = taskQueueSize - tasks.length;

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
                num = taskQueueSize - tasks.length;

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

exports.taskQueue = function(req, res) {
    getAndAssignTasks(req, function(err, tasks) {
        res.send(200, {
            tasks: tasks.map(function(task) {
                return task._id;
            })
        });
    });
};

exports.getTask = function(req, res) {
    var id = req.params.id;

    Task.findOne({_id: id}, function(err, task) {
        if (err || !task) {
            res.send(404);
            return;
        }

        var result = new Result(data.results[id]);
        result.user = user;
        result.task = task;
        result.save(function(err) {
            // The task is no longer assigned to the user.
            // TODO: If we want a minimum number of results before
            // closing we should change this logic.
            task.assigned = [];
            task.results.push(result);
            task.save(callback);
        });
    });

    getAndAssignTasks(req, function(err, tasks) {
        res.send(200, {
            tasks: tasks.map(function(task) {
                return task._id;
            })
        });
    });
};

exports.appCache = function(req, res) {
    baseAppCache.pipe(res);
};

exports.saveResults = function(req, res) {
    var data = req.body;
    var user = req.user;
    var ids = Object.keys(data.results);

    /* Task result format:
     * {
     *   ID: {
     *       data: {...},
     *       started: Date,
     *       completed: Date
     *   }
     * }
     */

    async.eachLimit(ids, 5, function(id, callback) {
        Task.findOne({_id: id}, function(err, task) {
            if (err || !task) {
                return callback(err);
            }

            var result = new Result(data.results[id]);
            result.user = user;
            result.task = task;
            result.save(function(err) {
                // The task is no longer assigned to the user.
                // TODO: If we want a minimum number of results before
                // closing we should change this logic.
                task.assigned = [];
                task.results.push(result);
                task.save(callback);
            });
        });
    }, function(err, tasks) {
        if (err) {
            res.send(500, {error: "Error saving results."});
        } else {
            exports.taskQueue(req, res);
        }
    });
};