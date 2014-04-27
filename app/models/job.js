var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var JobSchema = new Schema({
    // The name of the job
    name: String,

    // A description of the job
    description: String,

    // The type of job (e.g. 'crop')
    type: String,

    // When the job was started
    started: {type: Date, default: Date.now},

    // When the job ended (if set, job is no longer active)
    ended: Date,

    api: {
        // Oauth2 endpoint for authenticating the user
        auth: String,

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