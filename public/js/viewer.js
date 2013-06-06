/**
 @fileoverview Socket code for the viewer client.
 @author Jacques Dafflon jacques.dafflon@gmail.com
 */

// Save current question id;
var questionId = null, socket, session;

/** Connect back to the server with a websocket */
var connect = function(host, port, session, mode) {
	var started = false;
	session = session;
	socket = io.connect('http://' + host + ':' + port + '/folo');
	socket.on('connect', function(event) {
		socket.emit('asq:viewer', {
			session : session,
			mode : mode
		});
		$('.asq-welcome-screen h4').text("You are connected to the presentation.");

		socket.on('asq:start', function(event) {
			if (!started) {
				console.log('started');
				$('#welcomeScreen').modal('hide');
				started = true;
			}
		});

		socket.on('asq:question', function(event) {
			questionId = event.question._id;
			showQuestion(event.question);
		});

		socket.on('asq:answer', function(event) {
			showAnswer(event.question);
		});

		socket.on('asq:hide-answer', function(event) {
			$('#answer').modal('hide');
		});

		/**
		 Handle socket event 'goto'
		 Uses impress.js API to go to the specified slide in the event.
		 */
		socket.on('asq:goto', function(event) {
			impress().goto(event.slide);
			//$('#answer').modal('hide');
		});

		/**
		 Handle socket event 'goto'
		 Uses impress.js API to go to the specified slide in the event.
		 */
		socket.on('asq:gotosub', function(event) {
			impress().gotoSub(event.substepIndex);
		});
	}).on('connect_failed', function(reason) {
		console.error('unable to connect to namespace', reason);
		$('.asq-welcome-screen h4').text("ERROR - Connection could not be established!");
	});

	// document.addEventListener('local:submit', function(event) {
	//     console.log(event)
	//     //socket.emit('asq:submit', {session:session, answers:event.detail.answers, questionId:questionId});
	//     //socket.emit('asq:submit', {session:session, answers:event.detail.serializedForm, questionId:event.detail.questionId});
	// });

	document.addEventListener('local:resubmit', function(event) {
		socket.emit('asq:resubmit', {
			questionId : questionId
		});
	});
}
var showQuestion = function(question) {
	$('#blockOptions').css("display", "none");
	$('#changeAnswer').css("display", "none");
	$('#sendanswers').removeAttr("disabled");

	$('#questionText').html('<h3>' + question.questionText + '</h3><button type="button" class="close" data-dismiss="modal" aria-hidden="true">X</button>');
	var optionsstring = '';
	if (question.questionType === "Multiple choice") {
		optionsstring = '<span class="help-block">Please select all correct answers.</span>';
		for (var i = 0; i < question.answeroptions.length; i++) {
			optionsstring += '<label class="checkbox"><input type="checkbox" id="checkbox' + i + '">' + question.answeroptions[i].optionText + '</label>';
		}

	} else {
		optionsstring = '<span class="help-block">Please enter your solution. Capitalisation will be ignored.</span>';
		optionsstring += '<input type="text" id="textbox" placeholder="Your solution...">';
	}

	$('#answeroptions').html(optionsstring);
	$('#question').modal('show');
}
var showAnswer = function(question) {
	$('#answerText').html('<h3>Statistics for</h3><h4>"' + question.questionText + '"</h4> <button type="button" class="close" data-dismiss="modal" aria-hidden="true">X</button>');

	var optionsstring = [];
	if (question.questionType === 'Multiple choice') {
		for (var i = 0; i < question.answeroptions.length; i++) {
			optionsstring.push('<label class="checkbox" >');
			if (question.answeroptions[i].correct === true) {
				optionsstring.push('<i class="icon-ok"> </i>');
			} else {
				optionsstring.push('<i class="icon-remove"> </i>');
			}
			optionsstring.push(question.answeroptions[i].optionText)
			optionsstring.push('</label>');
		}

	} else {
		optionsstring.push('<span class="help-block">Correct answer.</span>');
		optionsstring.push('<p></p>');
		optionsstring.push('<span class="help-block">Your answer.</span>');
		optionsstring.push('<input type="text" value="Norway" readonly>');
	}

	$('#answersolutions').html(optionsstring.join(''));
	//$('#answer').on('show', function() {
	//   $('#question').on('hidden', function() {/*nothing*/});
	//});
	$('#question').on('hidden', function() {
		$('#answer').modal('show')
	});
	$('#question').modal('hide');
}
var send = function() {
	var answers = [];
	for (var i = 0; i < $('#answeroptions').children().size() - 1; i++) {
		if ($('#textbox').length > 0) {
			answers[i] = $('#textbox').val();
		} else {
			if ($('#checkbox' + i).is(':checked')) {
				answers[i] = true;
			} else {
				answers[i] = false;
			}
		}

	}
	var myEvent = new CustomEvent("local:submit", {
		"detail" : {
			"answers" : answers
		}
	});
	document.dispatchEvent(myEvent);

	$('#blockOptions').css("display", "block");
	$('#changeAnswer').removeAttr("style");
	$('#sendanswers').attr("disabled", "disabled");
}
$(function() {

	$(document).on("click", ".changeAnswer" ,function(event) {
		console.log("ha");
		var questionId = $(this).parent().parent().find('input[type="hidden"][name="question-id"]').val();
		var resubmitEvent = new CustomEvent('local:resubmit', {});
		document.dispatchEvent(resubmitEvent);
		$('[data-question-id="' + questionId + '"] form').css('opacity', '1');
		$('[data-question-id="' + questionId + '"] form input').removeAttr('disabled');
		$('[data-question-id="' + questionId + '"] form button').removeAttr('disabled');
		$('[data-question-id="' + questionId + '"] .changeAnswer').fadeOut( function(){
			$('[data-question-id="' + questionId + '"] form button').fadeIn();
			$('[data-question-id="' + questionId + '"] .changeAnswer').remove();
		});
	});

	// form submission events
	$(document).on('submit', '.assessment form', function(event) {
		event.preventDefault();

		// var myEvent = new CustomEvent("local:submit", {
		//      "detail" : {
		//          "questionId" : $(this).find('input[type="hidden"][name="question-id"]').val(),
		//          "serializedForm" : $(this).serializeArray()
		//      }
		//  });
		// document.dispatchEvent(myEvent);

		var questionId = $(this).find('input[type="hidden"][name="question-id"]').val()
		$('[data-question-id="' + questionId + '"] form').css('opacity', '0.5');
		$('[data-question-id="' + questionId + '"] form input').attr('disabled', 'true');
		$('[data-question-id="' + questionId + '"] form button').attr('disabled', 'true');
		$('[data-question-id="' + questionId + '"] form').after('<div class="changeAnswer" style="display: none"><p><button class="btn btn-primary">Modify answer</button>&nbsp; &nbsp; <span class="muted"> ✔ Your answer has been submitted.<span></p></div>');
		$('[data-question-id="' + questionId + '"] form button').fadeOut( function(){
		$('[data-question-id="' + questionId + '"] .changeAnswer').fadeIn();
		});

		//aggregate answers
		var answers = [];
		$(this).find('input[type=checkbox], input[type=radio]').each(function(){
			answers.push($(this).is(":checked"));
		})

		$(this).find('input[type=text]').each(function(){
			answers.push($(this).val());
		})

		console.log(answers)
		
		socket.emit('asq:submit', {
			session : session,
			answers : answers,
			questionId : questionId
		});
		console.log('submitted')
	})
})


google.load("visualization", "1", {
	packages : ["corechart"]
});

google.setOnLoadCallback(drawChart);

var rightVsWrongOptions ={
	width : 800,
};

distinctAnswersOptions = {
	title : 'How often was a group of options selected',
	width : 800,
	isStacked : true,
	legend : {
		position : 'top',
		alignment : 'center'
	}
};

distinctOptionsOptions = {
	title : 'How often was an option selected',
	isStacked : true,
	width : 800,
	legend : {
		position : 'top',
		alignment : 'center'
	}
};

var rightVsWrongData = new Array();
var rightVsWrongChart = new Array();

var participationData = new Array();
var participationChart= new Array();

var distinctOptionsData = new Array();
var distinctOptionsChart = new Array();

var distinctAnswersData = new Array();
var distinctAnswersChart = new Array();

function drawChart() {
	$('.stats').each(function(el) {
		var questionId = $(this).data('target-assessment-id');
		//var sampler = google.visualization.arrayToDataTable([['Correctness', 'Number of submissions'], ['Correct answers', 19], ['Wrong answers', 4]]);
		//var sampleo = google.visualization.arrayToDataTable([['Option', 'Correct answers', 'Wrong answers'], ['Switzerland', 19, 0], ['Italy', 0, 3], ['France', 0, 1], ['Europe', 23, 0]]);
		//var samplea = google.visualization.arrayToDataTable([['Submission', 'Correct answers', 'Wrong answers'], ['Europe & Switzerland', 19, 0], ['Europe & Italy', 0, 3], ['Europe & France', 0, 1]]);
		//RightVsWrongData[questionId] = sampler;
		//distinctOptionsData[questionId] = sampleo;
		//distinctAnswersData[questionId] = samplea;
		rightVsWrongChart[questionId] = new google.visualization.PieChart($(this).find(".rvswChart")[0]);
		distinctOptionsChart[questionId] = new google.visualization.ColumnChart($(this).find(".distinctOptions")[0]);
		distinctAnswersChart[questionId] = new google.visualization.ColumnChart($(this).find(".distinctAnswers")[0]);
	})
}


$('a[data-toggle="tab"]').on('shown', function(e) {
	var questionId = $(this).parent().parent().parent().data('target-assessment-id');
	//console.log(questionId);
	$.getJSON('/stats/getStats?question=' + questionId + '&metric=rightVsWrong', function(data) {
		rightVsWrongData[questionId] = google.visualization.arrayToDataTable(data);
		rightVsWrongChart[questionId].draw(rightVsWrongData[questionId], rightVsWrongOptions);
	});
	$.getJSON('/stats/getStats?question=' + questionId + '&metric=distinctOptions', function(data) {
		distinctOptionsData[questionId] = google.visualization.arrayToDataTable(data);
		distinctOptionsChart[questionId].draw(distinctOptionsData[questionId], distinctOptionsOptions);
	});
	$.getJSON('/stats/getStats?question=' + questionId + '&metric=distinctAnswers', function(data) {
		distinctAnswersData[questionId] = google.visualization.arrayToDataTable(data);
		distinctAnswersChart[questionId].draw(distinctAnswersData[questionId], distinctAnswersOptions);
	});

});


function updateStats(questionId){
	
}
