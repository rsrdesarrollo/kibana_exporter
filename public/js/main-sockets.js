$(function(){
    var socket = io();

    var message_box = $("#message");
    var progress_bar = $("#job-progress");
    var message_txt = $("#message-txt");
    var url_query = $("#url_query");
    var error = $("#error");

    function update_progress_bar(value){
        var pb = progress_bar.children(".progress-bar");
        pb.attr("aria-valuenow", value);
        pb.width(value+"%");
        
    }

    function submit_job(event){
        event.preventDefault();
        socket.emit('new job', {url_query:url_query.val()});
    }

    function notify_job_start(data){
        message_box.slideDown();
        message_box.addClass('alert-info');
        message_box.removeClass('alert-success');
        message_txt.text("Job submited success. Starting job...");
        progress_bar.show();
        
        update_progress_bar(0);
    }

    function notify_job_status(data){
        message_txt.text("Runing Job ..."+data.done+"/"+data.total);
        update_progress_bar(data.progress);
    }

    function notify_job_end(data){
        message_box.removeClass('alert-info');
        message_box.addClass('alert-success');
        progress_bar.fadeOut();
        message_txt.html("<span>Job finished: </span><a href='/job/"+data.file_result+"'> Download result</a>");

    }

    function notify_error(data){
        message_box.slideUp();
        error.text(data.msg);
        error.slideDown();

        setTimeout(function(){error.fadeOut()}, 10000);
    }

    socket.on('job started', notify_job_start);
    socket.on('job status', notify_job_status);
    socket.on('job end', notify_job_end);
    socket.on('job error', notify_error);

    $("#job").submit(submit_job);

});

