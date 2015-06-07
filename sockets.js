var export_kibana_job = require('./jobs/export-kibana-job');

function handle_new_job(client, data){
    
    console.log("New Job", data);
    client.emit('job started');

    var job = new export_kibana_job(client,data);
    job.run(function(err){
        if(err)
            console.log("[!] ERROR runing job: ", err);
    })
}

module.exports = function(io){
    io.on('connect', function(socket){
        socket.on('new job', handle_new_job.bind(null,socket));
        
        socket.on('disconnect', function(){
        });
    });
}
