'use strict';

var when         = require('when');
var gen          = require('when/generator');
var wkeys        = require('when/keys');
var nodefn       = require('when/node/function');
var logger       = require('logger-asq');
var Slideshow    = db.model('Slideshow');
var Session      = db.model('Session');
var SessionEvent = db.model('SessionEvent');
var Question     = db.model('Question');
var ObjectId     = require("mongoose").Types.ObjectId;

module.exports = function(socketUtils){

  var createGotoSessionEvents = function(sessionid, socket, slide, 
    inactiveExercises, activeExercises, inactiveQuestions, activeQuestions){
    var events = [];
    var userId = socket.user._id.toString();

    // goto event
    events.push(new SessionEvent({
      session: sessionid,
      type: "ctrl:goto",
      data: {
        user: userId,
        slide: slide
      }
    }));

    // de-activate previous exercises events
    inactiveExercises.forEach(function(ex){
      events.push(new SessionEvent({
        session: sessionid,
        type: "exercise-deactivated",
        data: {
          user: userId,
          exercise: ObjectId(ex)
        }
      }));
    });

    // activate current exercises events
    activeExercises.forEach(function(ex){
      events.push(new SessionEvent({
        session: sessionid,
        type: "exercise-activated",
        data: {
          user: userId,
          exercise: ObjectId(ex)
        }
      }));
    });

    // de-activate previous questions events
    inactiveQuestions.forEach(function(q){
      events.push(new SessionEvent({
        session: sessionid,
        type: "question-deactivated",
        data: {
          user: userId,
          question: ObjectId(q)
        }
      }));
    });

    // activate current questions events
    activeQuestions.forEach(function(q){
      events.push(new SessionEvent({
        session: sessionid,
        type: "question-activated",
        data: {
          user: userId,
          question: ObjectId(q)
        }
      }));
    });

    return SessionEvent.create(events);
  }

  /*
   *  Emit an event to the ctrl, folo & ghost namespaces to go to a specific slide.
   */
  var goto = gen.lift(function *gotoGen(socket, evt) {
    try{
      // only accept ctrl goto events
      if (socket.nsp.name !== '/ctrl') return;
      var session = yield Session
        .findOne({_id: socket.request.sessionId})
        .populate('slides')
        .exec();

      // TODO load adapter based on presentation type
      var pf = session.slides.presentationFramework;
      var adapter = require('../presentationAdapter/adapters')[pf];
      var nextSlide = adapter.getSlideFromGotoData(evt.data);

      if (nextSlide == null){
        logger.debug("lib.uitls.socket:goto nextSlide is null")
        // drop event
        return;
      }

      var slideshow = yield Slideshow.findById(session.slides).lean().exec()
      session.activeSlide = nextSlide;
      var inactiveExercises = session.activeExercises || [];
      var activeExercises = session.activeExercises = slideshow.exercisesPerSlide[nextSlide] || []
      
      var inactiveQuestions = session.activeQuestions || [];
      var activeQuestions = session.activeQuestions = slideshow.questionsPerSlide[nextSlide] || [];


      yield session.save(); 

      // async create events
      createGotoSessionEvents(session._id, socket, nextSlide,
        inactiveExercises, activeExercises,inactiveQuestions, activeQuestions);
      
      socketUtils.emitToRoles('asq:goto', evt, session._id, 'ctrl', 'folo', 'ghost');

    }catch(err) {
      logger.error('On goto: ' + err.message, {err: err.stack});
    };
  });

  var handleSocketEvent = function(eventName, socket, evt){
     switch(eventName){
      case "asq:goto":
        goto(socket, evt);
        break
     }
  }

  return {
    handleSocketEvent: handleSocketEvent
  }

}
