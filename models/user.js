var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var UserSchema = new Schema({
    name: String,
    created: {type: Date, "default": Date.now}
});

mongoose.model("User", UserSchema);