
$(function() {
    var jobs = new Jobs();

    jobs.loadFromCache(function() {
        jobs.update(function() {
            renderJobs(jobs);
            $("#jobs").removeClass("hidden");
        });
    });
});

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

$(document).on("click", "#jobs a", function() {
    $("#jobs").addClass("hidden");
    $("#content").removeClass("hidden");

    TaskManager.init({
        id: this.id,
        type: "image-select",
        el: $("#module")[0]
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