
/**
 * Module dependencies.
 */

var mongoose = require("mongoose"),
    User = mongoose.model("User");

/**
 * Formats mongoose errors into proper array
 *
 * @param {Array} errors
 * @return {Array}
 * @api public
 */

var formatErrors = function(errors) {
    var keys = Object.keys(errors);
    var errs = [];

    // if there is no validation error, just display a generic error
    if (!keys) {
        console.log(errors);
        return ["Oops! There was an error"];
    }

    keys.forEach(function (key) {
        errs.push(errors[key].type);
    });

    return errs;
};


var login = function(req, res) {
    if (req.session.returnTo) {
        res.redirect(req.session.returnTo);
        delete req.session.returnTo;
        return;
    }
    res.redirect("/");
};

exports.signin = function(req, res) {};

/**
 * Auth callback
 */

exports.authCallback = login;

/**
 * Show login form
 */

exports.login = function(req, res) {
    res.render("users/login", {
        title: "Login",
        message: req.flash("error")
    });
};

/**
 * Show sign up form
 */

exports.signup = function(req, res) {
    res.render("users/signup", {
        title: "Sign up",
        user: new User()
    });
};

/**
 * Logout
 */

exports.logout = function(req, res) {
    req.logout();
    res.redirect("/login");
};

/**
 * Session
 */

exports.session = login;

/**
 * Create user
 */

exports.create = function(req, res) {
    var user = new User(req.body);
    user.provider = "local";
    user.save(function(err) {
        if (err) {
            return res.render("users/signup", {
                errors: formatErrors(err.errors),
                user: user,
                title: "Sign up"
            });
        }

        // manually login the user once successfully signed up
        req.logIn(user, function(err) {
            if (err) return next(err)
            return res.redirect("/")
        });
    });
};

/**
 *    Show profile
 */

exports.show = function(req, res) {
    var user = req.profile
    res.render("users/show", {
        title: user.name,
        user: user
    });
};

/**
 * Find user by id
 */

exports.user = function(req, res, next, id) {
    User.findOne({ _id : id }).exec(function(err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return next(new Error("Failed to load User " + id));
        }
        req.profile = user;
        next();
    });
};