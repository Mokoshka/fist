'use strict';

var Server = /** @type Server */ require('./core/server');

var _ = require('lodash-node');
var path = require('path');

var S_FIST_PLUGINS = path.join('fist_plugins', '**', '*.js');

/**
 * @returns {Server}
 * */
function fist(params) {
    var app = new Server(_.extend({}, params));

    _.forEach([app.params.root], function (dirname) {
        return app.install(path.join(dirname, S_FIST_PLUGINS));
    });

    return app;
}

module.exports = fist;
