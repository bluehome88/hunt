'use strict';

var
  int = require('./../interface.js'),
  winston = require('winston'),
  assert = require('assert');

/**
 * @method ExportModelToRestParameters#canUpdate
 * @param {User} User
 * @param {function} callback - function(error, canUpdateBoolean, arrayOfSettersNamesToUse){...}
 * @description
 * Model instance method, that is called to determine, does the current authenticated user
 * have rights to edit this particular entity, and what setters can be used.
 * @example
 *  //ACL check for ability to update some fields in this current document
 * TrophySchema.methods.canUpdate = function (user, callback) {
 *   var document = this;
 *   callback(null, (document.owner == user.id), ['name', 'scored', 'priority']);
 * };
 */


module.exports = exports = function (core, parameters, router) {

  router.post(/^\/([0-9a-fA-F]{24}|\d+)$/, function (request, response) {
    assert(typeof request.model[parameters.modelName].canCreate === 'function',
      'Hunt.exportModelToRest() - hunt.model.' + parameters.modelName + '.statics.canCreate(error, canCreate, arrayOfSettersToUse){} is not defined!');

    request.model[parameters.modelName]
      .findById(request.params[0])
      .exec(function (error, modelFound) {
        if (error) {
          throw error;
        }
        if (modelFound) {
          core.errorResponses.error409(response);
        } else {
          process.nextTick(function () {
            request.model[parameters.modelName].canCreate(request.user, function (error, canCreate, arrayOfSettersToUse) {
              if (error) {
                throw error;
              }

              if (canCreate) {
                var
                  patch = {},
                  item = new request.model[parameters.modelName]();
                item[parameters.ownerId] = request.user._id;
                arrayOfSettersToUse.map(function (setter) {
                  patch[setter] = request.body[setter];
                  item.set(setter.toString(), request.body[setter]);
                });
                item._id = request.params[0];
                item.id = request.params[0];
                item.save(function (error, itemCreated) {
                  if (error) {
                    core.errorResponses.processError(error, response);
                  } else {
                    /**
                     * @event Hunt#REST:collectionName:CREATE:itemCreatedId
                     * @property {string} ip - ip address of remote host
                     * @property {string} ips - proxy chain if present - {@link http://expressjs.com/api.html#req.ips}
                     * @property {string} modelName - name of model being created
                     * @property {Object} document - document created
                     * @property {Object} seed - fields used to create new object
                     * @property {User} user - user who did this request, and you can blaim him/her for breaking things
                     */
                    request.huntEmit(['REST', parameters.modelName, 'CREATE', itemCreated.id], {
                      'ip': request.ip,
                      'ips': request.ips,
                      'userAgent': request.headers['user-agent'],

                      'user': request.user,

                      'modelName': parameters.modelName,
                      'document': itemCreated,
                      'seed': patch

                    });

                    winston.info('REST:%s:CREATE:%s', parameters.modelName, itemCreated.id, {
                      'ip': request.ip,
                      'ips': request.ips,
                      'userAgent': request.headers['user-agent'],

                      'userId': request.user ? request.user.id : null,
                      'user': request.user ? request.user.toString() : null,
                      'userKeychain': request.user ? JSON.stringify(request.user.keychain) : null,

                      'modelName': parameters.modelName,
                      'documentId': itemCreated.id,
                      'document': itemCreated.toString(),
                      'seed': JSON.stringify(patch)
                    });


                    response
                      .status(201)
                      .set('Location', parameters.mountPoint + '/' + itemCreated.id)
                      .json({
                        'status': 'Created',
                        'code': 201,
                        'location': parameters.mountPoint + '/' + itemCreated.id,
                        'id': itemCreated.id
                      });
                  }
                });
              } else {
                if (request.user) {
                  core.errorResponses.error403(response);
                } else {
                  core.errorResponses.error401(response);
                }
              }
            });
          });
        }
      });
  });

  router.put(/^\/([0-9a-fA-F]{24}|\d+)$/, core.preload(parameters.modelName), function (request, response) {
    if (request.preload.canWrite === true) {
      var patch = {};

      request.preload.fieldsWritable.map(function (setter) {
        if (typeof setter === 'string') {
          patch[setter] = {
            'new': request.body[setter],
            'old': request.preload.model[setter]
          };
          request.preload.model.set(setter, request.body[setter]);
        }
      });
      request.preload.model.save(function (error) {
        if (error) {
          core.errorResponses.processError(error, response);
        } else {
          /**
           * @event Hunt#REST:collectionName:UPDATE:itemId
           * @property {string} ip - ip address of remote host
           * @property {string} ips - proxy chain if present - {@link http://expressjs.com/api.html#req.ips}
           * @property {string} modelName - name of model being deleted
           * @property {Object} document - document being deleted
           * @property {User} user - user who did this request, and you can blaim him/her for breaking things
           * @property {Object} patch - fields being updated, something like `{"new":{"scored":true}, "old":{"scored":false}}`
           */
          request.huntEmit(['REST', parameters.modelName, 'UPDATE', request.preload.model.id], {
            'ip': request.ip,
            'ips': request.ips,
            'userAgent': request.headers['user-agent'],

            'user': request.user,

            'modelName': parameters.modelName,
            'document': request.preload.model,
            'patch': patch

          });

          winston.info('REST:%s:UPDATE:%s', parameters.modelName, request.preload.model.id, {
            'ip': request.ip,
            'ips': request.ips,
            'userAgent': request.headers['user-agent'],

            'userId': request.user ? request.user.id : null,
            'user': request.user ? request.user.toString() : null,
            'userKeychain': request.user ? JSON.stringify(request.user.keychain) : null,

            'modelName': parameters.modelName,
            'documentId': request.preload.model.id,
            'document': request.preload.model.toString(),
            'patch': JSON.stringify(patch)
          });

          request.huntEmit('broadcast', {'type': parameters.genSub(request.preload.model), 'patch': patch});
          response.status(200).json({'status': 'Updated', 'code': 200, 'patch': patch});
        }
      });
    } else {
      if (request.user) {
        core.errorResponses.error403(response);
      } else {
        core.errorResponses.error401(response);
      }
    }
  });

  router.patch(/^\/([0-9a-fA-F]{24}|\d+)$/, core.preload(parameters.modelName), function (request, response) {
    if (request.preload.canWrite === true) {
      var patch = {};

      request.preload.fieldsWritable.map(function (setter) {
        if (typeof setter === 'string' && request.body[setter] !== undefined) {
          patch[setter] = {
            'new': request.body[setter],
            'old': request.preload.model[setter]
          };
          request.preload.model.set(setter, request.body[setter]);
        }
      });

      int.save(request.model[request.preload.modelName], request.preload.model, function (error) {
        if (error) {
          core.errorResponses.processError(error, response);
        } else {
          /**
           * @event Hunt#REST:collectionName:UPDATE:itemId
           * @property {string} ip - ip address of remote host
           * @property {string} ips - proxy chain if present - {@link http://expressjs.com/api.html#req.ips}
           * @property {string} modelName - name of model being deleted
           * @property {Object} document - document being deleted
           * @property {User} user - user who did this request, and you can blaim him/her for breaking things
           * @property {Object} patch - fields being updated, something like `{"new":{"scored":true}, "old":{"scored":false}}`
           */
          request.huntEmit(['REST', parameters.modelName, 'UPDATE', request.preload.model.id], {
            'ip': request.ip,
            'ips': request.ips,
            'userAgent': request.headers['user-agent'],

            'user': request.user,

            'modelName': parameters.modelName,
            'document': request.preload.model,
            'patch': patch

          });

          winston.info('REST:%s:UPDATE:%s', parameters.modelName, request.preload.model.id, {
            'ip': request.ip,
            'ips': request.ips,
            'userAgent': request.headers['user-agent'],

            'userId': request.user ? request.user.id : null,
            'user': request.user ? request.user.toString() : null,
            'userKeychain': request.user ? JSON.stringify(request.user.keychain) : null,

            'modelName': parameters.modelName,
            'documentId': request.preload.model.id,
            'document': request.preload.model.toString(),
            'patch': JSON.stringify(patch)
          });
          request.huntEmit('broadcast', {'type': parameters.genSub(request.preload.model), 'patch': patch});
          response.status(200).json({'status': 'Updated', 'code': 200, 'patch': patch});
        }
      });
    } else {
      if (request.user) {
        core.errorResponses.error403(response);
      } else {
        core.errorResponses.error401(response);
      }
    }
  });
};