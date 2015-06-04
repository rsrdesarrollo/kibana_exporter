function demo_sample_job(client){
    var aux = 0;
    var progress = function(){
        aux += 10;
        if(aux < 100){
            setTimeout(progress, 100);
            client.emit('job status', {
                done: aux,
                total: 100,
                progress: aux
            }); 
        }else{
            client.emit('job end', {file_result:"/js/jquery.js"});
        }
        

        console.log("Job progress:", aux);

    };

    progress();
}

function handle_new_job(client, data){
    
    console.log("New Job", data, client);
    client.emit('job started');

    demo_sample_job(client);
}

module.exports = function(io){
    io.on('connect', function(socket){
        socket.on('new job', handle_new_job.bind(null,socket));
        
        socket.on('disconnect', function(){
        });
    });
}
