var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var TaskSchema = new Schema({
    // The creator of the job
    creator: {type: ObjectId, ref: "User", required: true},

    // The job against which the data is being run
    job: {type: String, ref: "Job", required: true},

    // The user(s) to which the data is currently assigned
    assigned: [{type: ObjectId, ref: "User"}],

    // The results of the user actions against the data
    results: [{type: ObjectId, ref: "Result"}],

    // Any data (to be passed to the client) to help the user
    data: Schema.Types.Mixed,

    // Any files (to be serialized and sent to the client) for processing
    files: [{
        // The name of the file (e.g. foo.jpg)
        name: {type: String, required: true},

        // The content type of the file (e.g. image/jpeg)
        type: {type: String, required: true},

        // The full location of the file (e.g. /var/files/foo.jpg or
        // http://foo.com/bar.jpg)
        path: {type: String, required: true},

        // Any additional data about the file (e.g. width/height)
        data: Schema.Types.Mixed
    }]
});

mongoose.model("Task", TaskSchema);