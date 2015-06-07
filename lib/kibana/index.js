var elastic = require('elasticsearch');
var config = require("../../config");
var path = require('path');
var async = require('async');
var _ = require('underscore');


function Kibana(host){
    this.client = new elastic.Client({
        host: path.join(host, "elasticsearch")
    });
}

Kibana.prototype.get_default_index = function(cb){
    var context = this;

    async.waterfall([
        function(cb){
            context.client.get({
                index: config.kibana_index,
                type: "config",
                id: config.kibana_version
            }, function(err, res){
                cb(err,res);
            });    
        },
        function(res, cb){
            var idx_name = res._source.defaultIndex;

            if(idx_name.charAt(0) == '['){
                // Time based index
                var name = idx_name.match(/\[(.*)\]/)[1];
                var date_format = idx_name.match(/\](.*)/)[1];

                cb(null, {
                    name: name,
                    id: idx_name,
                    date_format: date_format
                });

            }else{
                // Not time based index
                cb(null, {
                    name: idx_name,
                    id: idx_name
                });
            }
        },
        function(index, cb){
            context.client.get({
                index: config.kibana_index,
                type: "index-pattern",
                id: index.id
            }, function(err,res){
                index.time_field = res._source.timeFieldName;
                cb(err,index);
            })
        }
        
    ], function (err, res){
        if(err){
            console.log("ERROR: [Kibana.get_default_index] ",err);
        }

        cb(err,res);
    });

}


module.exports = Kibana;
