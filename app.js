var http = require("http");
var path = require("path");
var fs = require("fs");

var express = require("express");
var swig = require("swig");
var mongoose = require("mongoose");
var passport = require("passport");
var mongoStore = require("connect-mongo")(express);
var flash = require("connect-flash");

var env = process.env.NODE_ENV || "development";
var pkg = require("./package");
var config = require("./config/config")[env];
var mongoURL = process.env.MONGO_URL || config.db;

mongoose.connect(mongoURL);

// Load models
var modelsDir = __dirname + "/app/models";

fs.readdirSync(modelsDir).forEach(function (file) {
    if (~file.indexOf(".js")) {
        require(modelsDir + "/" + file);
    }
});

var routes = require("./routes");
var users = require("./app/controllers/users");
var jobs = require("./app/controllers/jobs");

// Bootstrap passport config
require("./config/passport")(passport, config);

var app = express();

app.configure(function() {
    app.set("port", process.env.PORT || 3000);
    swig.setDefaults({ cache: false });
    app.engine("swig", swig.renderFile);
    app.set("views", __dirname + "/app/views");
    app.set("view engine", "swig");
    app.set("view cache", false);

    app.use(express.bodyParser());
    app.use(express.methodOverride());

    // cookieParser should be above session
    app.use(express.cookieParser());
    app.use(express.session({
        secret: pkg.name,
        store: new mongoStore({
            url: mongoURL,
            collection: "sessions"
        })
    }));

    // Passport session
    app.use(passport.initialize());
    app.use(passport.session());

    // Flash messages
    app.use(flash());

    // expose pkg and node env to views
    app.use(function (req, res, next) {
        res.locals.pkg = pkg
        res.locals.env = env
        next();
    });
    
    app.use(express.favicon());
    app.use(express.logger("dev"));
    app.use(app.router);
    app.use(express.static(path.join(__dirname, "public")));
});

app.configure("development", function() {
    app.use(express.errorHandler());
});

var requiresLogin = function(responseData) {
    return function (req, res, next) {
        if (!req.isAuthenticated()) {
            if (responseData !== undefined) {
                return res.send(responseData);
            } else {
                req.session.returnTo = req.originalUrl;
                return res.redirect("/login");
            }
        }
        next();
    };
};

var passportOptions = {
    failureFlash: "Invalid email or password.",
    failureRedirect: "/login"
};

var loginJSON = {
    error: "Login required.",
    login: true
};

app.get("/login", users.login);
app.get("/signup", users.signup);
app.get("/logout", users.logout);
app.post("/users", users.create);
app.post("/users/session", passport.authenticate("local", passportOptions),
    users.session);
app.get("/users/:userId", users.show);

app.param("userId", users.user);

app.get("/", requiresLogin(), routes.index);
app.get("/mobile", requiresLogin(), routes.mobile);
app.get("/jobs", requiresLogin(loginJSON), routes.getJobs);
app.get("/jobs/:jobId", requiresLogin(loginJSON), routes.taskQueue);
app.post("/jobs/:jobId", requiresLogin(loginJSON), routes.saveResults);
app.get("/jobs/:jobId/task/:task", requiresLogin(loginJSON), routes.getTask);
app.get("/offline.appcache", requiresLogin(""), routes.appCache);

app.param("jobId", jobs.job);

app.listen(app.get("port"));

console.log("Connected on port:", app.get("port"));
