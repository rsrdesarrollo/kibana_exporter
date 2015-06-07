"use strict";

function Job(client, data){
    this.client = client;
    this.data = data;
    this.done = 0;
    this.total = 0;
}

Job.prototype.run = function(cb){
    var context = this; 

    this.parse_data(function(err, res){
       if(err) throw err;

       context._run(res,cb);
    });
}


Job.prototype.notify_error = function(err){
    this.client.emit('job error',{msg:err});
}

Job.prototype.notify_progress = function(){
    var progress = Math.round(this.done*10000/this.total)/100;
    console.log(
        "Job",this.job_id,
        "Progress ",progress+"%", 
        "[",this.done,"/",this.total,"]"
    );
    this.client.emit('job status', {
        done: this.done,
        total: this.total,
        progress: progress
    })
}

Job.prototype.notify_end = function(data){
    this.client.emit('job end', data);
}

Job.prototype._run = function(){
    throw "_run: Not implemented!";
}

Job.prototype.parse_data = function(){
    throw "parse_data: Not implemented!";
}

module.exports = Job;

