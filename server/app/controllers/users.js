var mongoose = require("mongoose");
var User = mongoose.model("User");

var resWithUser = function(res, user) {
    var data = user.toJSON();
    data.id = data._id;
    delete data._id;
    delete data.__v;
    res.send(200, data);
};

exports.connect = function(req, res) {
    User.findById(req.body.data.id, function(err, user) {
        if (user) {
            return resWithUser(res, user);
        }

        var user = new User({
            _id: req.body.data.id,
            provider: req.body.data.provider,
            data: req.params.data.data
        });

        user.genAuthToken();

        user.save(function(err) {
            resWithUser(res, user);
        });
    });
};

exports.auth = function() {
    return function(req, res, next) {
        var query = {
            _id: req.params.user,
            authToken: req.params.token
        };

        User.findOne(query).exec(function(err, user) {
            if (err) {
                return next(err);
            }

            if (!user) {
                return next(new Error("Unknown user."));
            }

            req.user = user;
            next();
        });
    };
};