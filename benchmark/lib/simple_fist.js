'use strict';

var fist = require('../../fist');
var app = fist();
var f = require('util').format;

app.logger.conf({
    logLevel: 'NOTSET'
});

app.route('/index/', {
    name: 'index',
    unit: 'index'
});

app.unit({
    name: 'index',
    main: function (track) {
        track.res.end('OK');
    }
});

app.listen(1337);
