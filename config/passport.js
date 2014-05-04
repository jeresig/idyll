
/*!
 * Module dependencies.
 */

var mongoose = require("mongoose");
var LocalStrategy = require("passport-local").Strategy;
var TokenStrategy = require("passport-token").Strategy;
var User = mongoose.model("User");

/**
 * Expose
 */

module.exports = function(passport) {
    // serialize sessions
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User.findOne({ _id: id }, function (err, user) {
            done(err, user);
        });
    });

    // use local strategy
    passport.use(new LocalStrategy(
        {
            usernameField: "email",
            passwordField: "password"
        },
        function(email, password, done) {
            User.findOne({ email: email }).exec(function(err, user) {
                if (err) {
                    return done(err);
                }
                if (!user) {
                    return done(null, false, { message: "Unknown user" });
                }
                if (!user.authenticate(password)) {
                    return done(null, false, { message: "Invalid password" });
                }
                return done(null, user);
            });
        }
    ));

    // use token strategy
    passport.use(new TokenStrategy(
        {
            usernameHeader: "x-email",
            usernameField: "email"
        },
        function(email, token, done) {
            User.findOne({ email: email }).exec(function(err, user) {
                if (err) {
                    return done(err);
                }
                if (!user) {
                    return done(null, false, { message: "Unknown user" });
                }
                if (user.authToken !== token) {
                    return done(null, false, { message: "Invalid token" });
                }
                return done(null, user);
            });
        }
    ));
};