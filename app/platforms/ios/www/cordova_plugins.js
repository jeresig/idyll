cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/com.phonegap.plugins.oauthio/www/oauth.js",
        "id": "com.phonegap.plugins.oauthio.OAuth",
        "clobbers": [
            "OAuth"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.inappbrowser/www/inappbrowser.js",
        "id": "org.apache.cordova.inappbrowser.inappbrowser",
        "clobbers": [
            "window.open"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "com.phonegap.plugins.oauthio": "0.1.1",
    "org.apache.cordova.inappbrowser": "0.4.1-dev"
}
// BOTTOM OF METADATA
});