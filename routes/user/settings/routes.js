/** @module routes/user/settings/routes
    @description routes for /:userid/settings
*/
'use strict';

var handlers       = require('./handlers')
  , appLogger     = require('../../../lib/logger').appLogger;

module.exports.setUp = function setUp(app, middleware) {
  appLogger.debug('Setting settings routes');
  
  app.get('/:user/settings/', middleware.isRouteOwner, handlers.getSettings);

  //Render the general settings
  app.get('/:user/settings/general', middleware.isRouteOwner, handlers.getGeneralSettings);

  //Render the users settings
  app.get('/:user/settings/users', middleware.isRouteOwner, handlers.getUsersSettings);
 
  //Render the plugins settings
  app.get('/:user/settings/plugins', middleware.isRouteOwner, handlers.getPluginsSettings);

  //Update the user settings
  app.post('/:user/settings/users', middleware.isRouteOwner,
    handlers.postUserSettings);
}