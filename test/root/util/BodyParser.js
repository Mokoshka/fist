'use strict';

var BodyParser = require('../../../util/BodyParser');

var mediaTyper = require('media-typer');
var http = require('../../util/http');

var _ = require('lodash-node');

function toParams (mime) {
    mime = mediaTyper.parse(mime);

    return _.extend(mime.parameters, mime);
}

module.exports = {

    'BodyParser.prototype.parse': [
        function (test) {

            http({
                method: 'get'
            }, function (req, res) {

                var parser = new BodyParser();

                parser.parse(req).done(function (data) {
                    test.deepEqual(data, {
                        input: {},
                        type: void 0
                    });
                    res.end();
                });
            }, function (err) {
                test.ok(!err);
                test.done();
            });
        },
        function (test) {
            http({
                method: 'post',
                body: 'asd'
            }, function (req, res) {
                var parser = new BodyParser();

                parser.parse(req).done(function (data) {
                    test.deepEqual(data, {
                        input: {},
                        type: void 0
                    });
                    res.end();
                });
            }, function (err) {
                test.ok(!err);
                test.done();
            });
        },
        function (test) {
            http({
                method: 'get',
                body: 'asd',
                headers: {
                    'content-type': 'text/plain'
                }
            }, function (req, res) {

                var mime = toParams(req.headers['content-type']);

                var parser = new BodyParser(_.extend(mime, {
                    length: req.headers['content-length']
                }));

                parser.parse(req).done(function (data) {
                    test.deepEqual(data, {
                        input: new Buffer('asd'),
                        type: 'raw'
                    });
                    res.end();
                });
            }, function (err) {
                test.ok(!err);
                test.done();
            });
        },
        function (test) {
            http({
                method: 'post',
                body: 'a=42',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded'
                }
            }, function (req, res) {

                var mime = toParams(req.headers['content-type']);

                var parser = new BodyParser(_.extend(mime, {
                    length: req.headers['content-length']
                }));

                parser.parse(req).done(function (data) {
                    test.deepEqual(data, {
                        input: {
                            a: '42'
                        },
                        type: 'urlencoded'
                    });
                    res.end();
                });

            }, function (err) {
                test.ok(!err);
                test.done();
            });
        },
        function (test) {
            http({
                method: 'post',
                body: '{"a": "42"}',
                headers: {
                    'content-type': 'application/json'
                }
            }, function (req, res) {

                var mime = toParams(req.headers['content-type']);

                var parser = new BodyParser(_.extend(mime, {
                    length: req.headers['content-length']
                }));

                parser.parse(req).done(function (data) {
                    test.deepEqual(data, {
                        input: {
                            a: '42'
                        },
                        type: 'json'
                    });
                    res.end();
                });
            }, function (err) {
                test.ok(!err);
                test.done();
            });
        },
        function (test) {
            http({
                method: 'post',
                body: '{"a": "42"}',
                headers: {
                    'content-type': 'application/foo+json'
                }
            }, function (req, res) {

                var mime = toParams(req.headers['content-type']);

                var parser = new BodyParser(_.extend(mime, {
                    length: req.headers['content-length']
                }));

                parser.parse(req).done(function (data) {
                    test.deepEqual(data, {
                        input: {
                            a: '42'
                        },
                        type: 'json'
                    });
                    res.end();
                });
            }, function (err) {
                test.ok(!err);
                test.done();
            });
        },
        function (test) {
            http({
                method: 'post',
                body: '{"a": "42}',
                headers: {
                    'content-type': 'application/json'
                }
            }, function (req, res) {

                var mime = toParams(req.headers['content-type']);

                var parser = new BodyParser(_.extend(mime, {
                    length: req.headers['content-length']
                }));

                parser.parse(req).fail(function (err) {
                    test.ok(err instanceof SyntaxError);
                    res.end();
                }).done();
            }, function (err) {
                test.ok(!err);
                test.done();
            });
        },
        function (test) {
            http({
                method: 'get',
                headers: {
                    'content-type': 'application/json'
                }
            }, function (req, res) {

                var mime = toParams(req.headers['content-type']);

                var parser = new BodyParser(_.extend(mime, {
                    length: req.headers['content-length']
                }));

                parser.parse(req).done(function (body) {
                    test.deepEqual(body, {
                        type: void 0,
                        input: {}
                    });
                    res.end();
                });
            }, function (err) {
                test.ok(!err);
                test.done();
            });
        },
        function (test) {
            http({
                method: 'post',
                body: {
                    dima: 'ok'
                },
                bodyEncoding: 'multipart'
            }, function (req, res) {

                var mime = toParams(req.headers['content-type']);

                var parser = new BodyParser(_.extend(mime, {
                    length: req.headers['content-length']
                }));

                parser.parse(req).done(function (data) {
                    test.deepEqual(data, {
                        input: {
                            dima: 'ok'
                        },
                        files: {},
                        type: 'multipart'
                    });
                    res.end();
                });
            }, function (err) {
                test.ok(!err);
                test.done();
            });
        }
    ]

};
