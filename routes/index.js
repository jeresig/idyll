var async = require("async");
var mongoose = require("mongoose");

exports.index = function(req, res) {
    res.render('index');
};

var getUser = function(name, callback) {
    var User = mongoose.model("User");

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
    var Image = mongoose.model("Image");
    var Selection = mongoose.model("Selection");

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