var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var TaskSchema = new Schema({
    // The job against which the data is being run
    job: {type: ObjectId, ref: "Job"},

    // The user(s) to which the data is currently assigned
    assigned: [{type: ObjectId, ref: "User"}],

    // The results of the user actions against the data
    results: [{type: ObjectId, ref: "Result"}],

    // Any data (to be passed to the client) to help the user
    data: Object,

    // Any files (to be serialized and sent to the client) for processing
    files: [{
        // The name of the file (e.g. foo.jpg)
        name: String,

        // The content type of the file (e.g. image/jpeg)
        type: String,

        // The full location of the file (e.g. /var/files/foo.jpg)
        path: String,

        // Any additional data about the file (e.g. width/height)
        data: Schema.Types.Mixed
    }]
});

mongoose.model("Task", TaskSchema);