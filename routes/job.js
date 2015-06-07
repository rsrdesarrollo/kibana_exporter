var fs = require('fs');
var path = require('path');
var mime = require('mime');
var express = require('express');
var config = require('../config');

var router = express.Router();

/* GET job. */
router.get('/:file_name', function(req, res, next) {
    var file_name = req.params.file_name
    var file = path.join(config.public_dir, file_name);
    var mimetype = mime.lookup(file);

    res.setHeader('Content-disposition', 'attachment; filename='+file_name);
    res.setHeader('Content-type', mimetype);

    var filestream = fs.createReadStream(file);

    filestream.pipe(res);
});

module.exports = router;
