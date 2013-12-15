var gm = require("gm").subClass({ imageMagick: true });

module.exports = function(img, selection) {
    return gm(img).crop(selection.width, selection.height,
        selection.x || 0, selection.y || 0);
};