"use strict";

var elasticsearch = require('elasticsearch');
var url = require('url');
var querystring = require('querystring');
var rison = require('rison');
var moment = require('moment');
var config = require('../config');
var kibana = require('../lib/kibana');
var path = require('path');
var json2csv = require('nice-json2csv');
var fs = require('fs');
var md5 = require('MD5');
var async = require('async');
var _ = require('underscore');

var Job = require('../jobs');


/**
 * Auxiliary methods
 */

function _sharedPrefix(words){
    var A = words.sort();
    var a1 = A[0], a2 = A[A.length - 1];
    var len = a1.length, i = 0;

    while(i < len && a1.charAt(i) == a2.charAt(i)) i++;

    return a1.substring(0,i);
}

function _generateFilter(filters){
    return {
        bool: filters.reduce(function(ret, it){
            if(!it.meta.disabled){
                if(it.meta.negate){
                    ret.must_not.push({query: it.query});
                }else{
                    ret.must.push({query:it.query});
                }
            }
            return ret;
        },{must:[], must_not:[]})
    };
}


/**
 * KibanaJob:
 *  Exports data from kibana query to csv file
 */

function KibanaJob(client, data){
    Job.call(this, client, data); 
};

KibanaJob.prototype = Object.create(Job.prototype);

/**
 * Implement interface
 */

KibanaJob.prototype.parse_data = function(cb){
    var _url = url.parse(this.data.url_query);
    var _url_hash = url.parse(_url.hash.replace('#','hash'));
    _url.query = _url_hash.query;

    var query = querystring.parse(_url.query);
    
    var kibanaCli = new kibana(path.join(_url.host,_url.pathname));

    var globalStash = rison.decode(query._g || '()');
    var appStash = rison.decode(query._a || '()');

    if(globalStash.time.mode != 'absolute'){
        return cb("Query date range type has to be absolute");
    }

    var from_date = moment(globalStash.time.from).utc()
    var to_date = moment(globalStash.time.to).utc()
    
    kibanaCli.get_default_index(function(err, idx){
        var ret = {
            host: path.join(_url.host, _url.pathname),
            query_arg: {}
        };

        var date_prefix = _sharedPrefix([
            from_date.format(idx.date_format),
            to_date.format(idx.date_format)
        ]);

        if(idx){
            if(idx.date_format){
                ret.query_arg['index'] = idx.name + date_prefix + "*";
            }else{
                ret.query_arg['index'] = idx.name;
            }
        }

        ret.query_arg['body'] = {
            query: {
                filtered: {
                    query: appStash.query
                }
            }
        }

        if(appStash.filters && appStash.filters.length > 0){
            ret.query_arg.body.query.filtered.filter = _generateFilter(appStash.filters); 
        }else{
            ret.query_arg.body.query.filtered.filter = {
                bool:{ must: [] }
            };
        }

        var range_date = {}
        range_date[idx.time_field] = {
            gte: from_date.format(),
            lte: to_date.format()
        }

        ret.query_arg.body.query.filtered.filter.bool.must.push({
            range : range_date      
        })
        
        cb(err,ret);
    })
}


KibanaJob.prototype._run = function(query_data, cb){
    console.log("[i] Runing export-kibana data:", query_data);
    this.es_cli = new elasticsearch.Client({
        host: path.join(query_data.host, "elasticsearch"),
        //log: 'trace'
    });
    
    var context = this;
    
    async.waterfall([
    function(cb){               // Check connection to elasticsearch
        context.es_cli.ping({
            requestTimeout: 3000,
            hello: "ping probe"
        }, function(err){
            cb(err);
        });
    }, function (cb){           // Do Job
        context.job_id = md5(JSON.stringify(query_data));
        var job_file = "job-"+context.job_id+".csv";
        var job_filepath = path.join(config.public_dir, job_file);

        if(fs.existsSync(job_filepath)){
            console.log("[i] SKIP: Job already done!");
            var res = {file_result:job_file};
            
            context.notify_end(res);
            cb(null)
            return;
        }

        var fd = fs.openSync(job_filepath,'w');
        var skip_headers = false;
        var headers = null;
        var BULK = config.job_bulk_size;
                                // Do
        async.doWhilst(function(cb){
            query_data.query_arg.from = context.done;
            query_data.query_arg.size = BULK;
            
                                    // Job
            async.waterfall([
                function(cb){               // Run query
                    context.es_cli.search(
                        query_data.query_arg,
                        function(err,res){
                           cb(err,res); 
                        }
                    );
                },function(res, cb){        // Clean results
                    
                    context.total = res.hits.total;
                    context.done += res.hits.hits.length;

                    var hits = res.hits.hits.map(function(it){
                        return it._source;
                    });
                    
                    if(hits.length <= 0)
                        cb(Error("Empty result"));
                    else
                        cb(null, hits);
                },function(hits, cb){       // Convert to CSV
                    var csv = json2csv.convert(
                        hits,
                        headers,
                        skip_headers
                    );
                    if(!skip_headers){
                        skip_headers = true;
                        var h = "["+csv.match(/(.*)\n/)[1] + "]";
                        headers = JSON.parse(h);
                    }

                    cb(null, csv);
                },_.partial(fs.write,fd)    // Write to file
            ],function(err){
                if(!err)
                    context.notify_progress();
                cb(err);
            });

        },function(){               // While
            return context.done < context.total;
        },function(err){        // Done
            fs.closeSync(fd);
            var res = {file_result:job_file};

            if(err) {
                context.notify_error(err);
                fs.unlinkSync(job_filepath);
            }else{
                context.notify_end(res);
            }

            cb(err, res);
        });

    }],
    function(err){
        if(err){
            console.log("ERROR: runing export-kibana-job", err);
            context.notify_error('Unable to connect to elasticsearch at '
                +query_data.host);
        }
    });
}


module.exports = KibanaJob;

