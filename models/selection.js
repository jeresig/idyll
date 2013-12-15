var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var Dimensions = {
    x: Number,
    y: Number,
    width: Number,
    height: Number
};

var SelectionSchema = new Schema({
    image: {type: ObjectId, ref: "Image"},
    user: {type: ObjectId, ref: "User"},
    started: Date,
    completed: Date,
    selections: [Dimensions]
});

mongoose.model("Selection", SelectionSchema);