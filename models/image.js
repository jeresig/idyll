var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var File = {
    file: String,
    width: Number,
    height: Number
};

var ImageSchema = new Schema({
    original: File,
    scaled: File,
    type: {type: String, "default": "crop"},
    selections: [{type: ObjectId, ref: "Selection"}]
});

mongoose.model("Image", ImageSchema);