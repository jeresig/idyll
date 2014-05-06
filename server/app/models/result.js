var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var ResultSchema = new Schema({
    // The id for the data which we the user processed
    task: {type: ObjectId, ref: "Task", required: true},

    // The user who processed the data
    user: {type: String, ref: "User", required: true},

    // When the user started processing the data (client-supplied)
    started: Date,

    // When the user finished processing the data (client-supplied)
    completed: Date,

    // The results from the user and their client, can be arbitrary
    results: [Schema.Types.Mixed]
});

mongoose.model("Result", ResultSchema);