var allFiles = [];
var width;
var height;
var ctx;
var previewCtx;
var aspect;
var img;
var rotated;
var points = [];
var curFile;
var username;
var userKey = "username";
var storageKey = "crop-data";
var attemptingSave = false;
var startTime;

var drawImage = function() {
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    if (rotated) {
        ctx.translate(width, 0);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, 0, 0, height, width);
    } else {
        ctx.drawImage(img, 0, 0, width, height);
    }
    ctx.restore();

    if (points.length >= 2) {
        var slice = computeSlice();
        var wRatio = Math.min(slice.w, 40) / slice.w;
        var hRatio = Math.min(slice.h, 40) / slice.h;
        previewCtx.clearRect(0, 0, 40, 40);
        previewCtx.drawImage(img, slice.x, slice.y,
            slice.w, slice.h,
            0, 0,
            slice.w * wRatio, slice.h * hRatio);
    }
};

var drawPoints = function() {
    drawImage();

    if (points.length === 2) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        var top = Math.min(points[0].y, points[1].y);
        var right = Math.max(points[0].x, points[1].x);
        var bottom = Math.max(points[0].y, points[1].y);
        var left = Math.min(points[0].x, points[1].x);
        ctx.fillRect(0, 0, width, top);
        ctx.fillRect(right, top, width - right, bottom - top);
        ctx.fillRect(0, bottom, width, height - bottom);
        ctx.fillRect(0, top, left, bottom - top);

        ctx.beginPath();
        ctx.lineWidth = "3";
        ctx.setLineDash([5]);
        ctx.strokeStyle = "rgb(0, 0, 0)";
        ctx.strokeRect(points[0].x, points[0].y,
            points[1].x - points[0].x, points[1].y - points[0].y);
        ctx.stroke();
        ctx.fill();
        ctx.closePath();
    }

    points.forEach(function(point) {
        ctx.fillStyle = "rgb(255, 0, 0)";
        ctx.fillRect(point.x - 5, point.y - 5, 10, 10);
    });
};

var dist = function(a, b) {
    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
};

var updateClosestPoint = function(newPoint) {
    var closest;
    var closestDist = Number.MAX_VALUE;

    points.forEach(function(point) {
        var newDist = dist(point, newPoint);
        if (newDist < closestDist) {
            closest = point;
            closestDist = newDist;
        }
    });

    closest.x = newPoint.x;
    closest.y = newPoint.y;
};

var computeSlice = function() {
    if (points.length < 2) {
        return {
            x: 0,
            y: 0,
            width: img.width,
            height: img.height
        };
    }

    var a = {x: points[0].x, y: points[0].y};
    var b = {x: points[1].x, y: points[1].y};

    var wRatio = width / height;
    var hRatio = height / width;
    var wScale = img.width / width;
    var hScale = img.height / height;

    // Switch the points back to their original position
    if (rotated) {
        var tmp = a.x;
        a.x = a.y / hRatio;
        a.y = (width - tmp) / wRatio;

        tmp = b.x;
        b.x = b.y / hRatio;
        b.y = (width - tmp) / wRatio;
    }

    var x = [Math.round(a.x * wScale), Math.round(b.x * wScale)];
    var y = [Math.round(a.y * hScale), Math.round(b.y * hScale)];

    return {
        x: Math.min.apply(Math, x),
        y: Math.min.apply(Math, y),
        width: Math.max.apply(Math, x) - Math.min.apply(Math, x),
        height: Math.max.apply(Math, y) - Math.min.apply(Math, y)
    };
};

var start = function() {
    username = window.localStorage[userKey];

    if (!username) {
        username = prompt("Enter Your Name");
        window.localStorage[userKey] = username;
    }

    var canvas = document.createElement("canvas");
    document.body.appendChild(canvas);

    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight - 40;
    aspect = getAspect(width, height);

    var down = false;

    $(canvas).on({
        "vmousedown": function() {
            down = true;
        },

        "vmousedown vmousemove": function(e) {
            if (!down) {
                return;
            }

            var point = {
                x: e.clientX,
                y: e.clientY
            };

            if (points.length >= 2) {
                updateClosestPoint(point);
            } else {
                points.push(point);
            }

            drawPoints();
        },

        "vmouseup": function() {
            down = false;
        }
    });

    $("#done").on("click", function() {
        writeData(curFile, computeSlice());

        loadImage();
    });

    ctx = canvas.getContext("2d");
    previewCtx = document.getElementById("preview").getContext("2d");

    loadImage();

    setInterval(attemptSave, 5000);
};

var getAspect = function(w, h) {
    return w > h ? "landscape" : "portrait";
};

var resetImage = function() {
    ctx.clearRect(0, 0, width, height);

    points = [];
    img = undefined;
    rotated = false;
    curFile = undefined;
};

var loadImage = function() {
    resetImage();

    var done = readData();

    for (var i = 0; i < allFiles.length; i++) {
        if (!(allFiles[i] in done)) {
            curFile = allFiles[i];
            break;
        }
    }

    if (!curFile) {
        alert("All done!");
        return;
    }

    img = document.createElement("img");
    img.src = curFile;
    img.onload = function() {
        rotated = getAspect(img.width, img.height) !== aspect;
        startTime = (new Date).getTime();

        drawImage();
    };
    document.body.appendChild(img);
};

var attemptSave = function() {
    if (attemptingSave) {
        return;
    }

    $("#save-status").text(window.navigator.onLine ?
        "Online." : "Offline.");

    if (!window.navigator.onLine) {
        return;
    }

    var data = readData();
    var toSave = {};
    var hasData = false;

    for (var prop in data) {
        if (!data[prop].saved) {
            toSave[prop] = data[prop];
            hasData = true;
        }
    }

    if (!hasData) {
        return;
    }

    attemptingSave = true;

    $("#save-status").text("Saving...");

    $.ajax({
        type: "POST",
        url: "/selections",
        contentType: "application/json",
        data: JSON.stringify({
            user: username,
            selections: toSave
        }),
        timeout: 8000,

        success: function() {
            attemptingSave = false;

            var curData = readData();

            // Remove the saved properties from the cache
            for (var file in data) {
                curData[file].saved = true;
            }

            saveData(curData);

            $("#save-status").text("Saved!");
        },

        error: function() {
            attemptingSave = false;

            $("#save-status").text("Error Saving.");
        }
    });
};

var readData = function() {
	return JSON.parse(window.localStorage[storageKey] || "{}");
};

var writeData = function(file, selection) {
    var data = readData();
    data[file] = {
        selections: [selection],
        started: startTime,
        completed: (new Date).getTime()
    };

	saveData(data);
};

var saveData = function(data) {
    window.localStorage[storageKey] = JSON.stringify(data);
};

$(window).on("online", attemptSave);

$.get("/data/images.txt", function(files) {
	allFiles = files.trim().split(/\n/);
	start();
});

$("html").on("touchstart", function(e) {
    e.preventDefault();
});
