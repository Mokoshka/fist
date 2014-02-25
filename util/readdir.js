'use strict';

var Fs = require('fs');

module.exports = function (dirname, done) {

    var ctx = this;

    try {
        Fs.readdir(dirname, function (err, list) {

            if ( 2 > arguments.length ) {

                return done.call(ctx, err);
            }

            list = list.sort();
            return done.call(ctx, null, list);
        });

    } catch (err) {

        done.call(ctx, err, done);
    }
};
