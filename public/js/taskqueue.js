var TaskManager = {
    init: function(jobID) {
        var self = this;

        this.taskQueue = new TaskQueue(jobID);
        this.results = new Results(jobID);

        $(this.results).on({
            saving: function() {
                $("#save-status").html(
                    "<span class='glyphicon glyphicon-floppy-save'></span> Saving...");
            },

            saved: function(e, data) {
                self.taskQueue.loadData(data.result);

                $("#save-status").html(
                    "<span class='glyphicon glyphicon-floppy-saved'></span> Saved!");
            },

            error: function() {
                $("#save-status").html(
                    "<span class='glyphicon glyphicon-floppy-remove'></span> Error Saving.");
            }
        });

        this.taskQueue.update(function() {
            self.nextTask();
        });

        $(window).on("online", function() {
            self.save();
        });
        setInterval(function() {
            self.save();
        }, 5000);

        // NOTE: Should we be creating this?
        this.canvas = document.createElement("canvas");
        document.body.appendChild(this.canvas);

        this.taskQueue.loadFromCache(function() {
            self.results.loadFromCache(function() {
                // Immediately attempt to save any pending results.
                self.save();
            });
        });
    },

    done: function(data) {
        this.taskQueue.markDone();
        this.results.finish(data);
        this.nextTask();
    },

    save: function() {
        $("#online-status").html(window.navigator.onLine ?
            "<span class='glyphicon glyphicon-ok-sign'></span> Online." :
            "<span class='glyphicon glyphicon-minus-sign'></span> Offline.");

        this.results.save();
    },

    nextTask: function() {
        var self = this;
        var task = this.taskQueue.latest();

        if (!task) {
            // TODO: Show some sort of error?
            // Get them to go online and re-sync, if offline.
            $("#sync-status").text("No more tasks! Go online.");
            return;
        }

        task.files.forEach(function(file) {
            if (typeof file.file === "string") {
                // NOTE: For now it's assumed that all files are images
                var img = new Image();
                img.src = "data:" + file.type + "," + file.file;
                file.file = img;
            }

            return file;
        });

        this.results.start(task);
    }
};

var SyncedDataCache = function() {
    this.url = "";
    this.data = [];
    this.loading = false;
    this.saving = false;
};

/*
 * Events:
 *  - error
 *  - saving
 *  - saved
 */

SyncedDataCache.prototype = {
    loadFromCache: function(callback) {
        var self = this;
        localforage.getItem(this.cacheKey, function(data) {
            self.data = data;
            callback();
        });
    },

    saveToCache: function(callback) {
        localforage.saveItem(this.cacheKey, this.data, callback);
    },

    loginRedirect: function() {
        window.location.href = "/login?returnTo=" +
            encodeURIComponent(window.location.pathname);
    },

    handleError: function(data, callback) {
        if (data && data.login) {
            this.loginRedirect();
        } else {
            $(this).trigger("error");
            if (callback) {
                callback({error: "Error retreiving data."}, this.data);
            }
        }
    },

    loadData: function(data, callback) {
        this.data = data;
        this.saveToCache(callback);
    },

    update: function(callback) {
        var self = this;

        if (this.loading || !navigator.onLine) {
            callback(null, self.data);
            return;
        }

        this.loading = true;

        // Always attempt to get the latest queue if we're online.
        $.ajax({
            type: "GET",
            url: this.url,
            dataType: "json",
            timeout: 8000,

            complete: function() {
                self.loading = false;
            },

            success: function(data) {
                if (data.error) {
                    self.handleError(data, callback);
                    return;
                }

                self.loadData(data, function() {
                    callback(null, self.data);
                });
            },

            error: function() {
                self.handleError();
            }
        });
    },

    save: function() {
        var self = this;

        if (this.saving || !navigator.onLine) {
            return;
        }

        var toSave = {};
        var hasData = false;

        for (var prop in this.toSave) {
            hasData = true;
            toSave[prop] = this.data[prop];
        }

        if (!hasData) {
            return;
        }

        this.saving = true;
        $(this).trigger("saving");

        $.ajax({
            type: "POST",
            url: this.url,
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify(toSave),
            timeout: 8000,

            complete: function() {
                self.saving = false;
            },

            success: function(data) {
                if (data.error) {
                    self.handleError(data);
                    return;
                }

                // Remove the saved items from the queue
                for (var prop in toSave) {
                    delete self.data[prop];
                }

                self.saveToCache(function() {
                    $(self).trigger("saved", {
                        saved: toSave,
                        result: data
                    });
                });
            },

            error: function() {
                self.handleError();
            }
        });
    }
};

var Jobs = function(callback) {
    this.data = [];

    this.loading = false;
    this.cacheKey = "jobs-data";

    this.loadFromCache(callback);
};

Jobs.prototype = new SyncedDataCache();

var Results = function(jobID) {
    this.data = {};

    this.url = "/jobs/" + jobID;
    this.saving = false;
    this.cacheKey = "result-data-" + jobID;
};

Results.prototype = new SyncedDataCache();

Results.prototype.start = function(taskID) {
    this.curTask = taskID;
    this.startTime = (new Date).getTime();
};

Results.prototype.finish = function(results) {
    var self = this;

    this.data[this.curTask] = {
        results: results,
        started: this.startTime,
        completed: (new Date).getTime()
    };

    this.curTask = this.startTime = undefined;

    this.saveToCache(function() {
        self.save();
    });
};

var TaskQueue = function(jobID) {
    this.data = [];

    this.loading = false;
    this.jobID = jobID;
    this.cacheKey = "task-queue-" + jobID;
};

TaskQueue.prototype = new SyncedDataCache();

TaskQueue.prototype.latest = function() {
    for (var i = 0; i < this.data.length; i++) {
        if (!this.data[i].done) {
            return this.data[i];
        }
    }
};

TaskQueue.prototype.markDone = function(callback) {
    var latest = this.latest();

    if (latest) {
        latest.done = true;
        this.saveToCache(callback);
    }
};