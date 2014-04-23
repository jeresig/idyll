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
    ended: Date
});

mongoose.model("Job", JobSchema);