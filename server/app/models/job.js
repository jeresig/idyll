var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var JobSchema = new Schema({
    // Client-specified ID of the job
    _id: String,

    // The creator of the job
    creator: {type: String, ref: "User", required: true},

    // The name of the job
    name: {type: String, required: true},

    // A description of the job
    description: String,

    // The type of job (e.g. 'crop')
    type: {type: String, required: true},

    // When the job was started
    started: {type: Date, default: Date.now},

    // When the job ended (if set, job is no longer active)
    ended: Date,

    // Track if the job is completed
    completed: Boolean,

    api: {
        // API endpoint for getting an array of IDs for the user
        // to complete.
        getTasks: String,

        // API endpoint for getting more information about a single
        // task from a server.
        getTask: String,

        // API endpoint for posting the results of a task as generated
        // by a user in the client.
        postResult: String
    }
});

mongoose.model("Job", JobSchema);