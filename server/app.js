var fs = require("fs");

var restify = require("restify");
var mongoose = require("mongoose");
var dotenv = require("dotenv");

dotenv.load();

mongoose.connect(process.env.MONGO_URL);

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

var server = restify.createServer({
    name: "Idyll"
});

server.use(restify.CORS());
server.use(restify.bodyParser());
server.use(restify.queryParser());
server.use(restify.gzipResponse());

// Dynamic API used by clients
server.get("/jobs", routes.getJobs);
server.get("/jobs/:jobId", users.auth(), routes.taskQueue);
server.post("/jobs/:jobId", users.auth(), routes.saveResults);
server.get("/jobs/:jobId/tasks/:task", users.auth(), routes.getTask);
server.post("/user/connect", users.auth(), users.connect);

// API used by Job/Task creators
server.post("/jobs", users.auth(true), routes.createJob);
server.post("/jobs/:jobId/tasks", users.auth(true), routes.createTask);

server.use(function(req, res, next) {
    if (req.param.jobId) {
        return jobs.job(req, res, next, req.param.jobId);
    }
    next();
});

server.listen(process.env.PORT || 3000);

console.log("Server started.");
