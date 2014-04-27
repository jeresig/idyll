var TaskManager = {
    init: function(jobID) {
        this.taskQueue = new TaskQueue(jobID);
        this.results = new Results(jobID);

        $(this.results).on({
            saved: function(e, data) {
                this.taskQueue.loadData(data.result);
            }.bind(this)
        });

        // TODO: Parallelize this.
        this.taskQueue.loadFromCache(function() {
            this.results.loadFromCache(function() {
                this.taskQueue.update(function() {
                    this.nextTask();
                }.bind(this));

                $(window).on("online", function() {
                    this.save();
                }.bind(this));

                setInterval(function() {
                    this.save();
                }.bind(this), 5000);

                // Immediately attempt to save any pending results.
                this.save();
            }.bind(this));
        }.bind(this));
    },

    done: function(data) {
        this.taskQueue.markDone();
        this.results.finish(data);
        this.nextTask();
    },

    save: function() {
        $(this).trigger("saving");
        this.results.save();
    },

    nextTask: function() {
        var taskID = this.taskQueue.latestTaskID();

        if (!taskID) {
            $(this).trigger("empty");
            return;
        }

        this.taskQueue.getTask(taskID, function(task) {
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
        });
    }
};

var SyncedDataCache = function() {
    this.url = "";
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
        localforage.getItem(this.cacheKey, function(data) {
            this.data = data;
            callback();
        }.bind(this));
    },

    saveToCache: function(callback) {
        localforage.saveItem(this.cacheKey, this.data, callback);
    },

    removeFromCache: function(callback) {
        localforage.removeItem(this.cacheKey, callback);
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
        if (this.processData) {
            data = this.processData(data);
        }
        this.data = data;
        this.saveToCache(callback);
    },

    update: function(callback) {
        // TODO: On taskQueue update, delete any old data out of the
        // localforage cache, make sure it doesn't stick around.

        if (this.loading || !navigator.onLine) {
            callback(null, this.data);
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
                this.loading = false;
            }.bind(this),

            success: function(data) {
                if (data.error) {
                    this.handleError(data, callback);
                    return;
                }

                this.loadData(data, function() {
                    callback(null, this.data);
                }.bind(this));
            }.bind(this),

            error: function() {
                this.handleError();
            }.bind(this)
        });
    },

    save: function() {
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
                this.saving = false;
            }.bind(this),

            success: function(data) {
                if (data.error) {
                    this.handleError(data);
                    return;
                }

                // Remove the saved items from the queue
                for (var prop in toSave) {
                    delete this.data[prop];
                }

                this.saveToCache(function() {
                    $(this).trigger("saved", {
                        saved: toSave,
                        result: data
                    });
                });
            }.bind(this),

            error: function() {
                this.handleError();
            }.bind(this)
        });
    }
};

var Jobs = function() {
    this.cacheKey = "jobs-data";
};

Jobs.prototype = new SyncedDataCache();

var Task = function(jobID, taskID) {
    this.url = "/jobs/" + jobID + "/tasks/" + taskID;
    this.cacheKey = "tasks-" + jobID + "-" + taskID;
};

Task.prototype = new SyncedDataCache();

var TaskQueue = function(jobID) {
    this.tasks = {};
    this.url = "/jobs/" + jobID;
    this.cacheKey = "task-queue-" + jobID;
};

TaskQueue.prototype = new SyncedDataCache();

TaskQueue.prototype.processData = function(data) {
    return data.map(function(task) {
        return {
            id: task,
            done: false
        }
    });
};

TaskQueue.prototype.removeTask = function(taskID, callback) {
    if (taskID in this.tasks) {
        var task = this.tasks[taskID];
        delete this.tasks[taskID];
        task.removeFromCache(callback);
        return;
    }

    var task = new Task(this.jobID, taskID);
    task.removeFromCache(callback);
};

TaskQueue.prototype.getTask = function(taskID, callback) {
    if (taskID in this.tasks) {
        callback(null, this.tasks[taskID]);
        return;
    }

    var task = new Task(this.jobID, taskID);

    task.loadFromCache(function() {
        if (task.data) {
            this.tasks[taskID] = task;
            callback(null, task);
        } else {
            task.update(function() {
                this.tasks[taskID] = task;
                callback(null, task);
            }.bind(this));
        }
    }.bind(this));
};

TaskQueue.prototype.latestTaskID = function() {
    for (var i = 0; i < this.data.length; i++) {
        if (!this.data[i].done) {
            return this.data[i].id;
        }
    }
};

TaskQueue.prototype.markDone = function(callback) {
    var taskId = this.latestTaskID();

    if (taskId) {
        this.data.forEach(function(task) {
            if (task.id === taskID) {
                task.done = true;
            }
        });

        this.removeTask(taskID, function(err, task) {
            this.saveToCache(callback);
        }.bind(this));
    }
};

var Results = function(jobID) {
    this.url = "/jobs/" + jobID;
    this.cacheKey = "result-data-" + jobID;
};

Results.prototype = new SyncedDataCache();

Results.prototype.start = function(taskID) {
    this.curTask = taskID;
    this.startTime = (new Date).getTime();
};

Results.prototype.finish = function(results) {
    this.data[this.curTask] = {
        results: results,
        started: this.startTime,
        completed: (new Date).getTime()
    };

    this.curTask = this.startTime = undefined;

    this.saveToCache(function() {
        this.save();
    }.bind(this));
};