var _ = require('underscore');

var export_kibana_job = require('./jobs/export-kibana-job');

function handle_new_job(session, data){
    
    console.log("New Job", data);
    session.client.emit('job started');

    var job = new export_kibana_job(session.client,data);
    job.run(function(err){
        if(err)
            console.log("[!] ERROR runing job: ", err);
    });

    session.job = job;
}

function handle_cancel_job(session){
    if(session.job){
        console.log("[i] Cancelling job ", session.job.job_id);
        session.job.cancel();
    }else{
        console.log("[i] No job to cancel");
    }
}

module.exports = function(io){
    io.on('connect', function(socket){
        var session = {
            client:socket
        };
        
        console.log("[i] New client from",socket.handshake.address,
                    'at',socket.handshake.time);

        socket.on('new job', _.partial(handle_new_job,session));
        socket.on('cancel job',_.partial(handle_cancel_job,session));       
        socket.on('disconnect', function(){
            console.log("[i] Client disconected",socket.handshake.address,": canceling pending jobs.");
            handle_cancel_job(session);
        });
    });
}
