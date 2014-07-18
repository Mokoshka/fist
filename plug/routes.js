'use strict';

var _ = require('lodash-node');
var path = require('path');

function exists (module) {

    try {
        require.resolve(module);

        return true;

    } catch (err) {

        return false;
    }
}

module.exports = function (done) {

    var routes = this.params.routes;

    if ( !_.isObject(routes) ) {
        routes = path.resolve(this.params.cwd, routes);

        if ( exists(routes) ) {
            routes = require(routes);

        } else {
            routes = [];
        }
    }

    if ( !_.isArray(routes) ) {
        routes = [routes];
    }

    _.forEach(routes, function (desc) {
        this.route(desc.pattern, desc);
    }, this);

    done();
};
