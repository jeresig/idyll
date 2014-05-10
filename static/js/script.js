OAuth.initialize(IDYLL_CONFIG.OAUTHIO_KEY);

var curUser;

// TODO: Check localforage and if user data is saved
// skip directly to loadJobs

TaskManager.addButton = function(label, callback) {
    $("<button>")
        .html(label)
        .on("click", callback)
        .appendTo("#buttons")
};

var loadJobs = function() {
    var jobs = new Jobs();

    jobs.loadFromCache(function() {
        jobs.update(function() {
            renderJobs(jobs);
            $("#jobs").switchPanel();
        });
    });
};

var renderJobs = function(jobs) {
    $("#jobs").html(
        jobs.data.map(function(job) {
            return "<div class='job'>" +
                "<a href='' id='" + job.id + "'>" + job.name + "</a>" +
                "<p class='desc'>" + job.description + "</p>" +
            "</job>";
        }).join("")
    );
};

jQuery.fn.switchPanel = function() {
    this.siblings().addClass("hidden");
    return this.removeClass("hidden");
};

$(document).on("click", ".login.fb", function() {
    OAuth.popup("facebook", {cache: true}, function(err, result) {
        if (err || !result) {
            // TODO: Handle this.
            console.error(err);
            return;
        }

        result.get({
            url: "/me",
            success: function(data) {
                curUser = data;
                curUser.provier = "fb";
                // Save user details in localforage
                loadJobs();
            },
            error: function() {
                // TODO: Handle this.
            }
        })
    });
});

$(document).on("click", "#jobs a", function() {
    $("#content").switchPanel();

    TaskManager.init({
        id: this.id,
        type: "image-select",
        el: $("#module")[0],
        user: curUser
    });

    return false;
});

$(TaskManager).on({
    saving: function() {
        $("#online-status").html(window.navigator.onLine ?
            "<span class='glyphicon glyphicon-ok-sign'></span> Online." :
            "<span class='glyphicon glyphicon-minus-sign'></span> Offline.");
    },

    resetting: function() {
        $("#module").empty();
        $("#buttons").empty();
    },

    empty: function() {
        // TODO: Show some sort of error?
        // Get them to go online and re-sync, if offline.
        $("#sync-status").text("No more tasks! Go online.");
    }
});

$(TaskManager.results).on({
    saving: function() {
        $("#save-status").html(
            "<span class='glyphicon glyphicon-floppy-save'></span> Saving...");
    },

    saved: function(e, data) {
        $("#save-status").html(
            "<span class='glyphicon glyphicon-floppy-saved'></span> Saved!");
    },

    error: function() {
        $("#save-status").html(
            "<span class='glyphicon glyphicon-floppy-remove'></span> Error Saving.");
    }
});

$("html").on("touchstart", function(e) {
    e.preventDefault();
});

$(window.applicationCache).on({
    updateready: function() {
        // Get the cache to update
        this.update();
        this.swapCache();
    },

    downloading: function() {
        $("#sync-status").text("Downloading files...");
    },

    noupdate: function() {
        $("#sync-status").text("Cached.");
    },

    cached: function() {
        $("#sync-status").text("Cached.");
    },

    error: function(e) {
        $("#sync-status").text("Error caching.");
    }
});