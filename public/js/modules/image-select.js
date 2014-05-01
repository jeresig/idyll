var SelectionCanvas = function(options) {
    this.canvas = document.createElement("canvas");
    options.el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");

    this.width = options.width;
    this.height = options.height;

    this.aspect = this.getAspect(this.width, this.height);

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.points = [];
    this.curImage = null;
    this.curTask = null;
    this.rotated = false;

    this.bind();
};

SelectionCanvas.prototype = {
    start: function(task) {
        this.resetImage();

        var file = task.files[0].file;

        this.curTask = task;
        this.curImage = file;

        var aspectRatio = this.getAspect(file.width, file.height);
        this.rotated = aspectRatio !== this.aspect;
        this.drawImage();
    },

    bind: function() {
        var self = this;
        var down = false;

        TaskManager.addButton("Next &raquo;", function() {
            self.saveSelection();
            self.resetSelection();
        });

        TaskManager.addButton("Done &raquo;", function() {
            self.saveSelection();
            TaskManager.done(self.getSelections());
        });

        $(this.canvas).on({
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

                if (self.points.length >= 2) {
                    self.updateClosestPoint(point);
                } else {
                    self.points.push(point);
                }

                self.drawPoints();
            },

            "vmouseup": function() {
                down = false;
            }
        });
    },

    resetImage: function() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.curTask = null;
        this.curImage = null;
        this.rotated = false;
        this.selections = [];

        this.resetSelection();
    },

    resetSelection: function() {
        this.points = [];
        this.drawImage();
    },

    getSelections: function() {
        return this.selections || [];
    },

    saveSelection: function() {
        var slice = this.computeSlice();
        if (slice.width !== 0 && slice.height !== 0) {
            this.selections.push(slice);
        }
    },

    drawImage: function() {
        var ctx = this.ctx;
        var width = this.width;
        var height = this.height;

        ctx.clearRect(0, 0, width, height);

        if (!this.curImage) {
            return;
        }

        ctx.save();

        if (this.rotated) {
            ctx.translate(width, 0);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(this.curImage, 0, 0, height, width);
        } else {
            ctx.drawImage(this.curImage, 0, 0, width, height);
        }

        ctx.restore();
    },

    drawPoints: function() {
        var ctx = this.ctx;
        var points = this.points;
        var width = this.width;
        var height = this.height;

        this.drawImage();

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
    },

    updateClosestPoint: function(newPoint) {
        var self = this;
        var closest;
        var closestDist = Number.MAX_VALUE;

        this.points.forEach(function(point) {
            var newDist = self.dist(point, newPoint);
            if (newDist < closestDist) {
                closest = point;
                closestDist = newDist;
            }
        });

        closest.x = newPoint.x;
        closest.y = newPoint.y;
    },

    computeSlice: function() {
        var img = this.curImage;
        var points = this.points;
        var width = this.width;
        var height = this.height;

        if (points.length < 2) {
            return {
                x: 0,
                y: 0,
                width: 0,
                height: 0
            };
        }

        var a = {x: points[0].x, y: points[0].y};
        var b = {x: points[1].x, y: points[1].y};

        var wRatio = width / height;
        var hRatio = height / width;
        var wScale = img.width / width;
        var hScale = img.height / height;

        // Switch the points back to their original position
        if (this.rotated) {
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
    },

    getAspect: function(w, h) {
        return w > h ? "landscape" : "portrait";
    },

    dist: function(a, b) {
        return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    }
};

TaskManager.register("image-select", SelectionCanvas);