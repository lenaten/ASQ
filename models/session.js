/** @module models/session
    @description the Session Model
*/

var mongoose   = require('mongoose')
var Schema     = mongoose.Schema;
var ObjectId   = Schema.ObjectId;
var when       = require('when');
var logger     = require('logger-asq');
var User       = db.model('User');
var Slideshow  = db.model('Slideshow');
var Promise     = require("bluebird");
var coroutine   = Promise.coroutine;
var socketPubSub = require('../lib/socket/pubsub');

var sessionSchema = new Schema({
  presenter            : { type: ObjectId, ref: 'User', required: true },
  slides               : { type: ObjectId, ref: 'Slideshow', required: true },
  flow                 : { type: String, required: true, default: 'ctrl',
                           enum: ['ctrl', 'self'] },
  authLevel            : { type: String, required: true, default: 'public',
                           enum: ['public', 'anonymous', 'private'] },
  activeSlide          : { type: String, required: true, default: '0' },
  startDate            : { type: Date, required: true, default: Date.now },
  endDate              : { type: Date, default: null },
  // answers              : { type:[{ type: ObjectId, ref: 'Answer' }],
  //                          default: [] },
  started              : { type: Boolean, default: false},
  activeExercises      : { type: [{ type: ObjectId, ref: 'Exercise' }],
                           default: [] },
  activeQuestions      : { type: [{ type: ObjectId, ref: 'Question' }],
                           default: [] },
  activeStatsQuestions : { type: [{ type: ObjectId, ref: 'Question' }],
                           default: [] }
});

sessionSchema.virtual('isTerminated').get(function() {
  return this.endDate !== null;
});

// Ensure only one session given a presenter and a set of slides.
sessionSchema.index({ presenter: 1, slides: 1 });

//slideshow should exist
sessionSchema.pre('save', true, function checkSlidesOnSave(next, done){
  next();

  Slideshow.findOne({_id : this.slides}, function(err, slideshow) {
    if (err) { done(err); }
    else if (!slideshow) {
      return done(new Error('Slides field must be a real Slideshow _id'));
    }
    done();
  });
});

//presenter should exist
sessionSchema.pre('save', true, function checkPresenterOnSave(next, done){
  next();

  User.findOne({_id : this.presenter}, function(err, presenter) {
    if (err) { done(err); }
    else if (!presenter) {
      return done(new Error('Presenter field must be a real User _id'));
    }
    done();
  });
});

sessionSchema.statics.getLiveSessions = function(userId, callback) {
  var deferred = when.defer();
  this.find({ presenter: userId, endDate: null},
  function onLiveSessions(err, sessions) {
    if (callback & (typeof (callback) === 'function')) {
      callback(err, sessions);
      return
    } else if (err) {
      deferred.reject(err);
    } else {
    deferred.resolve(sessions);
    }
  });
  return deferred.promise;
}

sessionSchema.statics.getLiveSessionIds = function(userId, callback) {
  var deferred = when.defer();
  this.find({ presenter: userId, endDate: null}, '_id',
  function onLiveSessions(err, sessions) {
    if (callback & (typeof (callback) === 'function')) {
      callback(err, sessions);
      return
    } else if (err) {
      deferred.reject(err);
    } else {
    deferred.resolve(sessions);
    }
  });
  return deferred.promise;
}

sessionSchema.statics.terminateAllSessionsForPresentation = coroutine(function *terminateAllSessionsForPresentationGen(userId, presentationId) {
  var terminatedSessions = [];
  var sessions = this.find({
      presenter: userId,
      slides: presentationId,
      endDate: null
    }).exec();

  yield Promise.map(sessions, function(session){
    session.endDate = Date.now();
    terminatedSessions.push(session);
    return session.save();
  });

  terminatedSessions.forEach(function(s){

    socketPubSub.emit('emitToRoles', {
      evtName: 'asq:session-terminated',
      event: {},
      sessionId: s._id,
      namespaces: ['ctrl', 'folo', 'ghost', 'stat']
    });
  })

  return terminatedSessions; 
});

sessionSchema.statics.terminateSession = coroutine(function *terminateSessionGen(userId, sessionId) {
  var session = yield this.findOne({
      presenter: userId,
      _id: sessionId,
      endDate: null
    }).exec();

  if(!session) {
    throw new Error('Could not find a live session with _id ' + sessionId + ' for User ' + userId);
  }

  // start with a bluebird promise to have the extra goodies
  yield Promise.resolve(true)
  .then(function(){
    session.endDate = Date.now();
    return session.save();
  });

   socketPubSub.emit('emitToRoles', {
      evtName: 'asq:session-terminated',
      event: {},
      sessionId: session._id,
      namespaces: ['ctrl', 'folo', 'ghost', 'stat']
    });

  return session
});

sessionSchema.methods.questionsForSlide = function(slideHtmlId) {
  var deferred = when.defer();
  Slideshow.findById(this.slides).exec()
    .then(function(slideshow){
      deferred.resolve(slideshow.getQuestionsForSlide(slideHtmlId));
    }
   ,function(err, slideshow) {
      throw err;
  });

  return deferred.promise;
}

sessionSchema.methods.statQuestionsForSlide = function(slideHtmlId) {
  var deferred = when.defer();
  Slideshow.findById(this.slides).exec()
    .then(function(slideshow){
      deferred.resolve(slideshow.getStatQuestionsForSlide(slideHtmlId));
    }
   ,function(err, slideshow) {
      deferred.reject(err);
  });

  return deferred.promise;
}

/**
* @ function isQuestionInSlide
* @description Checks if the questionId is inside a slide
* with an id of slideHtmlId, in the session;
*/
sessionSchema.methods.isQuestionInSlide = function(slideHtmlId, questionId) {
  var deferred = when.defer();
  this.questionsForSlide(slideHtmlId)
    .then(function(questions){
      for (var i=0; i<questions.length; i++){
        if (questions[i]== questionId){
           deferred.resolve(true);
        }
      }
      deferred.resolve(false);
    })
  return deferred.promise;
}

// Export virtual fields as well
sessionSchema.set('toObject', { virtuals: true });
sessionSchema.set('toJSON', { virtuals: true });

logger.debug('Loading Session model');
mongoose.model('Session', sessionSchema);

module.exports = mongoose.model('Session');