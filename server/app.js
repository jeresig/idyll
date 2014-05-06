var http = require("http");
var path = require("path");
var fs = require("fs");

var express = require("express");
var swig = require("swig");
var mongoose = require("mongoose");
var mongoStore = require("connect-mongo")(express);
var flash = require("connect-flash");
var dotenv = require("dotenv");

dotenv.load();

var pkg = require("./package");
var mongoURL = process.env.MONGO_URL;

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

    // Flash messages
    app.use(flash());

    // expose pkg and node env to views
    app.use(function (req, res, next) {
        res.locals.pkg = pkg;
        res.locals.env = process.env;
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

app.param("userId", users.user);

// TODO: Move these to be static files somewhere
app.get("/", routes.index);
app.get("/offline.appcache", routes.appCache);

// Dynamic API used by clients
app.get("/jobs", routes.getJobs);
app.get("/jobs/:jobId", users.auth(), routes.taskQueue);
app.post("/jobs/:jobId", users.auth(), routes.saveResults);
app.get("/jobs/:jobId/tasks/:task", users.auth(), routes.getTask);
app.post("/user/connect", users.auth(), users.connect);

// API used by Job/Task creators
app.post("/jobs", users.auth(true), routes.createJob);
app.post("/jobs/:jobId/tasks", users.auth(true), routes.createTask);

app.param("jobId", jobs.job);

app.listen(app.get("port"));

console.log("Connected on port:", app.get("port"));