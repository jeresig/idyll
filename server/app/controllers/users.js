var mongoose = require("mongoose");
var User = mongoose.model("User");

exports.connect = function(req, res) {
    var user = new User({
        _id: req.body.id,
        data: req.body.data,
        service: req.body.service
    });

    user.genAuthToken();

    user.save(function(err) {
        res.send(200);
    });
};

exports.auth = function(requiresToken) {
    return function(req, res, next) {
        var query = {
            _id: req.query.user || req.body.user;
        };

        if (requiresToken) {
            query.authToken = req.query.token || req.body.token;
        }

        User.findOne(iquery).exec(function(err, user) {
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