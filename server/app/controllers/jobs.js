var mongoose = require("mongoose");
var Job = mongoose.model("Job");

exports.job = function(req, res, next, id) {
    Job.findById(id).exec(function(err, job) {
        if (err) {
            return next(err);
        }
        if (!job) {
            return next(new Error("Failed to load Job " + id));
        }
        req.job = job;
        next();
    });
};