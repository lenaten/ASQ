var schemas =require("../models/models.js");
var fs = require("fs");

exports.getsingle=function(req, res) {
	res.sendfile(req.path);
}

//User is added to the database, and page is redirected to confirm the registration
exports.signup=function(req, res) {
	if (req.body.signupusername=="" || req.body.signuppassword=="") {
		res.render('index', {message: "Missing credentials", fromsignup:'true' });
		return;
	}
	var myRegxp = /^([a-zA-Z0-9_-]){3,10}$/;
	if(myRegxp.test(req.body.signupusername) == false|| myRegxp.test(req.body.signuppassword) == false)
	{
	    res.render('index', { message: "Credentials must be only alphanumeric, between 3 and 10 characters", fromsignup:'true' });
	    return;
	}
	var myRegxp = /\S+@\S+\.\S+/;
	if(myRegxp.test(req.body.signupemail) == false)
	{
	    res.render('index', { message: "Please insert a valid email adress", fromsignup:'true' });
	    return;
	}
	if (req.body.signuppassword!=req.body.signuppasswordconfirm) {
		res.render('index', {message: "The two passwords are not matching", fromsignup:'true' });
		return;
	}


	var users= db.model('User', schemas.userSchema);
	var out =users.findOne({ name: req.body.signupusername }, function (err, user) {
        if (user) {
		res.render('index', {message: "Username already taken", fromsignup:'true'  });
	} else {
		var newUser= new users({
		name: req.body.signupusername,
		password: req.body.signuppassword,
		email: req.body.signupemail
	}
	);
		newUser.save();
		res.render('registered', null);
	}
	});	

}





exports.checkusername=function(req,res) {
	User= db.model('User', schemas.userSchema);
	var response='0';
	var out =User.findOne({ name: req.params.username }, function (err, user) {
        if (user) {
		response='1';
	}
	res.send(200,response);
});
}

function loadJSON(filePath){
	var file = fs.readFileSync(filePath, 'utf8');
	return JSON.parse(file);
}

function preload(jsonFile) {
	var question = new Object({
		questionText:jsonFile.questionText,
		questionType: jsonFile.questionType,
		afterslide: jsonFile.afterslide,
		options: jsonFile.options
	});
	return question;
	

}



exports.parsequestion=function(req,res) {
	var questionDB= db.model('Question', schemas.questionSchema);
	questionDB.find({},function(err,question) {
	
		
	//question=preload(loadJSON('slides/example/question2.json'));
		var optionDB= db.model('Option', schemas.optionSchema);
		optionDB.find({ _id: { $in: question[0].answeroptions }}, function(err, options) {
			if (err) throw err;
			res.render('questionTemplate',{questionObj: question[0], arrayoptions: options, mode:'admin'});
		});
	
	});

}

exports.sendanswer=function(req,res) {
	question=preload(loadJSON('slides/example/question1.json'));
	console.log(question);
	res.render('answerTemplate',{questionObj: question, mode:'admin'});

}

function getQuestionStats(questionId){
	var answerDB= db.model('Answer', schemas.answerSchema);
	var questionDB= db.model('Question', schemas.questionSchema);
	
	questionDB.findById(questionId, function(err,question) {
		answerDB.find({question: questionId},function(err,answer) {
			var result = {
				total:null,
				correct: null,
				wrong: null,
				answers: [{answer: null, amount: null, correct: null}]
				}
			
			if(question.questionType == "Multiple choice"){
				
			}
			console.log(answer[0].answers[0]);
			console.log(answer);
			console.log(question);
			
		});
	});

}

exports.deletequestion=function(req,res) {
	
	var users= db.model('User', schemas.userSchema);
		var out =users.findById(req.user._id, function (err, user) {
		if (user) {
			var questionDB= db.model('Question', schemas.questionSchema);
			questionDB.remove({_id: req.query.quest}, function(err, question) {
				if (err) {
					console.log(err);
				}
			});
			var slideshowDB=db.model('Slideshow', schemas.slideshowSchema);
			slideshowDB.findById(req.query.id, function(err, slideshow) {
				for (var i=0;i<slideshow.questions.length;i++) {
					if (slideshow.questions[i]==req.query.quest) {
						slideshow.questions.splice( i, 1 );
						slideshow.save();
						
					}
				}
				
			});
			
			
		}
		res.redirect('/user/'+req.user.name + '/edit?id='+req.query.id);
		});
		
	
	
	
	
	
}

exports.addquestion=function(req,res) {
	
	var questionDB= db.model('Question', schemas.questionSchema);
	var newQuestion=new questionDB({
		questionText:req.body.questionText,
		questionType: req.body.questionType,
		afterslide: req.body.afterslide
		//answeroptions: optionsDB
	});
	newQuestion.save();
	
	var optionDB=db.model('Option', schemas.optionSchema);
	for (var i=0; i<256; i++) {
		if (req.param('option'+i)) {
			var newOptionDB=new optionDB( {
				optionText: req.param('option'+i),
			});
			newOptionDB.correct = req.param('checkbox'+i) ? true : false;
			newOptionDB.save()
			newQuestion.answeroptions.push(newOptionDB._id);
			newQuestion.save();
			} else {
				if (i>0) {
					break;
				}
			}

	}
	
	var nquestion=0;
	var slideshowDB=db.model('Slideshow', schemas.slideshowSchema);
	slideshowDB.findById(req.query.id, function(err, slideshow) {
		if (err) {
			console.log(err);
		} else {
			if (slideshow) {
				nquestion=slideshow.questions.length;
				slideshow.questions.push(newQuestion._id);
				slideshow.save();
			}
			
		}
	}
		);
	
	var answerDB = db.model('Answer', schemas.answerSchema);
	var testanswer = [];
	for(var i = 0; i<20; i++){
		var testans = {content: [true, false, false, false]};
		testanswer.push(testans)
	}
	for(var i = 0; i<5; i++){
		var testans = {content: [false, true, false, false]};
		testanswer.push(testans)
	}
	for(var i = 0; i<3; i++){
		var testans = {content: [false, false, true, false]};
		testanswer.push(testans)
	}
	for(var i = 0; i<10; i++){
		var testans = {content: [false, false, false, true]};
		testanswer.push(testans)
	}
	var newanswer = new answerDB({
		//question: "50c7738315ed6e214a000009",
		question: newQuestion._id,
		answers : testanswer
	}
	);
	newanswer.save();
	res.redirect('/user/'+req.user.name + '/edit?id='+req.query.id);
	
	
	
}

exports.editslideshow=function(req,res) {
	var users= db.model('User', schemas.userSchema);
	var out =users.findById(req.user._id, function (err, user) {
		if (err) {
			console.log(err);
		} else {
			if (user) {
		
				var slideshowbelongs=false;
				for (var i=0; i<user.slides.length;i++) {
					if (user.slides[i]==req.query.id) {
						slideshowbelongs=true;
						
					}
				}
				if (!slideshowbelongs) {
					res.redirect("/user");
				} else {
					var slideshowDB=db.model('Slideshow', schemas.slideshowSchema);
					slideshowDB.findById(req.query.id, function(err, slideshow) {
						if (err) {
							console.log(err);
						} else {
							if (slideshow) {
								
								var questions=[];
								var questionDB=db.model('Question', schemas.questionSchema);
								for (var i=0;i<slideshow.questions.length;i++) {
									questionDB.findById(slideshow.questions[i], function(err, question) {
										questions.push(question);
										if (questions.length==slideshow.questions.length) {
											
											res.render('edit', {arrayquestions: questions, username: req.user.name});
										}
									});
								}
								if (slideshow.questions.length==0) {
									res.render('edit', {arrayquestions: questions, username: req.user.name});
								}
								
							} else {
								res.redirect("/user");
							}
							
						}
					}
					);

				}
			
				
			}
		}
         
	});
		
	
	
}

exports.renderuser=function(req,res) {
	if (req.params.username==req.user.name) {
		var users= db.model('User', schemas.userSchema);
		var out =users.findById(req.user._id, function (err, user) {
		if (user) {
			slides=[];
			var slideshowDB=db.model('Slideshow', schemas.slideshowSchema);
			slideshowDB.find({ _id: { $in : user.slides } }, function(err, slides) {
				if (err) throw err;
				var type = req.query.type &&
						   /(succes|error|info)/g.test(req.query.type) ?
				           'alert-' + req.query.type : '';
				res.render('user', {arrayslides: slides, username: req.user.name, alert: req.query.alert, type:type, session: user.current});
			});
			
		} 
		});
    } else {
        res.redirect('/user/'+req.user.name + '/');
    }
}