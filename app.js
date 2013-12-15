var http = require("http");
var path = require("path");

var express = require("express");
var swig = require("swig");

var routes = require("./routes");

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

http.createServer(app).listen(app.get("port"), function() {
    console.log("Express server listening on port " + app.get("port"));
});
