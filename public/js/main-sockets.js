$(function(){
    var socket = io.connect();
    var job_runing = false;

    var message_box = $("#message");
    var progress_bar = $("#job-progress");
    var message_txt = $("#message-txt");
    var url_query = $("#url_query");
    var error = $("#error");
    var stat = $("#status");
    var cancel_btn = $("#cancel-job");
    var job_frm = $("form#job");

    function update_progress_bar(value){
        var pb = progress_bar.children(".progress-bar");
        pb.attr("aria-valuenow", value);
        pb.width(value+"%");
        
    }

    function submit_job(event){
        if(job_runing){
            notify_error({msg: "Job runing. Wait or cancel it."}, true);
        }else{
            event.preventDefault();
            socket.emit('new job', {url_query:url_query.val()});
        }
    }
    
    function cancel_job(){
        if(job_runing){
            socket.emit('cancel job');
            message_box.slideUp();
            job_runing = false;
        }
    }

    function notify_job_start(data){
        message_box.slideDown();
        message_box.addClass('alert-info');
        message_box.removeClass('alert-success');
        message_txt.text("Job submited success. Starting job...");
        progress_bar.show();

        job_runing = true;    
        cancel_btn.removeClass('disabled');
        update_progress_bar(0);
    }

    function notify_job_status(data){
        message_txt.text("Runing: Progress "+ data.progress+"% - [ "+data.done+" / "+data.total+" ]");
        update_progress_bar(data.progress);
    }

    function notify_job_end(data){
        message_box.removeClass('alert-info');
        message_box.addClass('alert-success');
        progress_bar.fadeOut();
        message_txt.html("<span>Job finished: </span><a href='/job/"+data.file_result+"'> Download result</a>");

        job_runing = false;
        cancel_btn.addClass('disabled');
    }

    function notify_error(data,prevent_msg_hide){
        if(!prevent_msg_hide){
            job_runing = false;
            message_box.slideUp();
        }
        error.text(data.msg);
        error.slideDown();

        setTimeout(function(){error.fadeOut()}, 10000);
    }

    function notify_socket_disconnect(){
        stat.html("<span class='glyphicon glyphicon-remove'><span/>");
        stat.addClass('label-danger');
        stat.removeClass('label-success');

        notify_error({msg: "Disconnected from server"});
    }

    function notify_socket_connect(){
        stat.html("<span class='glyphicon glyphicon-ok'><span/>");
        stat.removeClass('label-danger');
        stat.addClass('label-success');
    }

    socket.on('job started', notify_job_start);
    socket.on('job status', notify_job_status);
    socket.on('job end', notify_job_end);
    socket.on('job error', notify_error);
    socket.on('disconnect', notify_socket_disconnect);
    socket.on('connect', notify_socket_connect);

    job_frm.submit(submit_job);
    cancel_btn.click(cancel_job);

});

