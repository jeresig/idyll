var http = require("http");
var path = require("path");
var fs = require("fs");

var express = require("express");
var swig = require("swig");
var mongoose = require("mongoose");

var env = process.env.NODE_ENV || "development";

var config = require("./config/config")[env];
var routes = require("./routes");

mongoose.connect(config.db);

// Load models
var modelsDir = __dirname + "/models";

fs.readdirSync(modelsDir).forEach(function (file) {
    if (~file.indexOf(".js")) {
        require(modelsDir + "/" + file);
    }
});

var app = express();

app.configure(function() {
    app.set("port", process.env.PORT || 3000);
    swig.setDefaults({ cache: false });
    app.engine("swig", swig.renderFile);
    app.set("views", __dirname + "/views");
    app.set("view engine", "swig");
    app.set("view cache", false);
    app.use(express.favicon());
    app.use(express.logger("dev"));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, "public")));
});

app.configure("development", function() {
    app.use(express.errorHandler());
});

app.get("/", routes.index);

app.listen(app.get("port"));