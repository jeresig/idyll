var fs = require("fs");

var async = require("async");
var request = require("request");
var mongoose = require("mongoose");

var User = mongoose.model("User");
var Job = mongoose.model("Job");
var Task = mongoose.model("Task");
var Result = mongoose.model("Result");

var taskQueueSize = 200;

exports.createJob = function(req, res) {
    if (!req.body.data) {
        return res.send(500, {error: "No data specified."});
    }

    var data = {
        creator: req.user,
        _id: req.body.data.id,
        name: req.body.data.name,
        description: req.body.data.description,
        type: req.body.data.type,
        api: req.body.data.api
    };

    Job.findById(req.body.data.id, function(err, job) {
        if (job) {
            return res.send(500, {error: "Job already exists."});
        }

        Job.create(data, function(err, job) {
            if (err) {
                return res.send(500, err.toJSON());
            }

            res.send(200, job.toJSON());
        });
    });
};

exports.getJobs = function(req, res) {
    Job.find({ended: null}, function(err, jobs) {
        if (err) {
            return res.send(404);
        }

        jobs = jobs.map(function(job) {
            job = job.toJSON();
            job.id = job._id;
            delete job._id;
            delete job.__v;
            return job;
        });

        res.send(200, jobs);
    });
};

var getAndAssignTasks = function(req, callback) {
    var jobID = req.job._id;
    var user = req.user;

    Task.find({
        job: jobID,
        assigned: user._id
    })
    .exec(function(err, tasks) {
        if (err) {
            return callback(err);
        }

        var num = taskQueueSize - tasks.length;

        if (num <= 0) {
            return callback(null, tasks);
        }

        Task.find({
            job: jobID,
            assigned: {$size: 0},
            results: {$size: 0}
        })
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

            Task.find({
                job: jobID,
                assigned: {$ne: user},
                results: {$size: 0}
            })
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
    if (req.job.api && req.job.api.getTasks) {
        // TODO: Pass in user session
        return request(req.job.api.getTasks).pipe(res);
    }

    getAndAssignTasks(req, function(err, tasks) {
        res.send(200, {
            tasks: tasks.map(function(task) {
                return task._id;
            })
        });
    });
};

var cleanTask = function(req, res, task) {
    async.map(task.files, function(file, callback) {
        var buffers = [];
        var stream = file.path.indexOf("http") === 0 ?
            request(file.path) :
            fs.createReadStream(file.path);

        stream.on("data", function(buffer) {
            buffers.push(buffer);
        })
        .on("end", function() {
            callback(null, {
                name: file.name,
                type: file.type,
                file: Buffer.concat(buffers).toString("base64"),
                data: file.data
            });
        });
    }, function(err, files) {
        res.send(200, {
            id: req.params.task,
            type: req.job.type,
            data: task.data,
            files: files
        });
    });
};

exports.createTask = function(req, res) {
    if (!req.body.data) {
        return res.send(500, {error: "No data specified."});
    }

    var data = {
        creator: req.user._id,
        job: req.job._id,
        data: req.body.data.data,
        files: req.body.data.files
    };

    Task.create(data, function(err, task) {
        if (err) {
            return res.send(500, err);
        }

        res.send(200, task.toJSON());
    });
};

exports.getTask = function(req, res) {
    var id = req.params.task;

    if (req.job.api && req.job.api.getTask) {
        // TODO: Pass in Task ID and user session
        request(req.job.api.getTask, function(err, task) {
            if (err || !task) {
                return res.send(404);
            }

            cleanTask(req, res, JSON.parse(task));
        });
        return;
    }

    Task.findOne({_id: id}, function(err, task) {
        if (err || !task) {
            return res.send(404);
        }

        cleanTask(req, res, task);
    });
};

/* Task result format:
 * {
 *   ID: {
 *       data: {...},
 *       started: Date,
 *       completed: Date
 *   }
 * }
 */

exports.saveResults = function(req, res) {
    var data = req.body.data;
    var ids = Object.keys(data);

    if (req.job.api && req.job.api.saveResult) {
        // TODO: Pass in Task ID and user session
        request.post(req.job.api.saveResult, data, function(err) {
            if (err) {
                return res.send(404);
            }

            res.send(200);
        });
        return;
    }

    async.eachLimit(ids, 5, function(id, callback) {
        Task.findOne({_id: id}, function(err, task) {
            if (err || !task) {
                return callback(err);
            }

            var result = new Result(data[id]);
            result.user = req.user;
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