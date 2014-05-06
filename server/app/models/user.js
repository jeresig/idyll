var crypto = require("crypto");

var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var UserSchema = new Schema({
    // The User id, comes from the OAuth2 process.
    // Should be in the form: "SERVICE/SERVICE_ID"
    _id: String,

    // Data about the user from the OAuth'd service
    data: Schema.Types.Mixed,

    // The ID of the service through which the user is authenticated
    service: String,

    // A token to be used in future API requests
    authToken: String,

    // The date on which the user account was created
    created: {type: Date, "default": Date.now}
});

UserSchema.methods = {
    genAuthToken: function() {
        this.authToken = crypto.createHmac("sha1")
            .update((new Date).getTime()).digest("hex");
        return this.authToken;
    }
};

mongoose.model("User", UserSchema);