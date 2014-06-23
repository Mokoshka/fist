'use strict';

var Raw = require('../../../parser/Raw');
var Parted = require('../../util/Parted');
var Parser = require('../../../parser/Parser');
var http = require('../../util/http');

module.exports = {

    'Raw.prototype.parse': [
        function (test) {

            var req = new Parted(['П', new Buffer('рив'), 'ет']);
            var parser = new Raw();

            parser.parse(req).done(function (buf) {
                test.deepEqual(buf, new Buffer('Привет'));
                test.done();
            });
        },
        function (test) {

            var req = new Parted(['П', new Buffer('рив'), 'ет']);
            var parser = new Raw();

            parser.parse(req).fail(function (err) {
                test.strictEqual(err, '42');
                test.done();
            }).done();

            req.once('data', function () {
                req.emit('error', '42');
            });
        },

        function (test) {

            var req = new Parted('Hello'.split(''));
            req.pause = function () {};

            var parser = new Raw({
                limit: 3
            });

            parser.parse(req).fail(function (err) {
                test.deepEqual(err, {
                    received: 4,
                    expected: 3,
                    code: 'ELIMIT'
                });
                test.done();
            }).done();
        },

        function (test) {

            var req = new Parted('Hello'.split(''));
            req.pause = function () {};

            var parser = new Raw({
                length: 3
            });

            parser.parse(req).fail(function (err) {
                test.deepEqual(err, {
                    received: 5,
                    expected: 3,
                    code: 'ELENGTH'
                });
                test.done();
            }).done();
        }
    ]
};
