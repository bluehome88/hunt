'use strict';
/*global angular, io, window, $, async*/

var huntErrors = [];
angular
  .module('angular-hunt', ['ngResource'])
  .factory('huntSocketIo', ['$rootScope', function ($rootScope) {
    var socket = io();
    $(window).on('beforeunload', function () {
      socket.close(); //https://bugzilla.mozilla.org/show_bug.cgi?id=712329
    });
    return {
      on: function (eventName, callback) {
        socket.on(eventName, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            callback.apply(socket, args);
          });
        });
      },
      emit: function (eventName, data, callback) {
        socket.emit(eventName, data, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        });
      }
    };
  }])
  .factory('huntModel2', ['$http', 'huntSocketIo', function ($http, huntSocketIo) {
    return function (modelName, prefix) {
      prefix = prefix || '/api/v1/';

      function encodeQueryData(data) {
        data = data || {};
        var
          d,
          ret = [];
        for (d in data) {
          if (data.hasOwnProperty(d)) {
            ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
          }
        }
        return ret.join('&');
      }

      /**
       * @class AngularHuntModel
       * @constructor
       */
      function Model() {
        this.$saving = false;
        this.$subscribed = false;
        this.$validationErrors = [];
      }

      /**
       * @name AngularHuntModel.find
       * @param {object} parameters - query parameters to be used
       * @param {function} callback - optional callback(groupOfObjectsFound)
       * @description
       * Find group of entities filtered by query dictionary
       * Returns promise resolved with this object group.
       * Optionally calls a callback
       * @see AngularHuntModel.query
       * @returns {Promise}
       */
      Model.find = function (parameters, callback) {
        return $http.get(prefix + modelName + '?' + encodeQueryData(parameters))
          .then(function (response) {
            switch (response.status) {
            case 200:
              var ret = response.data.data.map(function (m) {
                var a = new Model();
                Object.keys(m).map(function (k) {
                  if (m.hasOwnProperty(k)) {
                    a[k] = m[k];
                  }
                });
                return a.$subscribe();
              });
              ret.$code = 200;
              ret.$status = response.data.status;
              ret.$metadata = response.data.metadata;
              if (typeof callback === 'function') {
                callback(ret);
              }
              return ret;
            default:
              throw new Error('HuntModel:' + response.status + ':' + response.data.message);
            }
          });
      };
      /**
       * @name AngularHuntModel.query
       * @param {object} parameters - query parameters to be used
       * @param {function} callback - optional callback(groupOfObjectsFound)
       * @description
       * Find group of entities filtered by query dictionary
       * Returns promise resolved with this object group.
       * Optionally calls a callback
       * @see AngularHuntModel.find
       * @returns {Promise}
       */
      Model.query = Model.find;

      /**
       * @name AngularHuntModel.findById
       * @param {string} id - server side generated object uid
       * @param {function} callback - optional callback
       * @description
       * Find entity with this id
       * Returns promise resolved with this object.
       * Optionally calls a callback
       * @see AngularHuntModel.find
       * @returns {Promise}
       */
      Model.findById = function (id, callback) {
        return $http.get(prefix + modelName + '/' + id)
          .then(function (response) {
            switch (response.status) {
            case 200:
              var ret = new Model();
              ret.$code = 200;
              ret.$status = response.data.status;
              ret.$metadata = response.data.metadata;
              Object.keys(response.data.data).map(function (k) {
                if (response.data.data.hasOwnProperty(k)) {
                  ret[k] = response.data.data[k];
                }
              });
              ret.$subscribe();
              if (typeof callback === 'function') {
                callback(ret);
              }
              return ret;
            default:
              throw new Error('HuntModel:' + response.status + ':' + response.data.message);
            }
          });
      };

      /**
       * @name AngularHuntModel.create
       * @param {obj} parameters - dictionary of setters of object to be created
       * @param {function} callback - optional callback(object)
       * @description
       * Tries to create object with parameters.
       * Returns promise resolved with this object.
       * Optionally calls a callback
       * @see AngularHuntModel.create
       * @returns {Promise}
       */

      Model.create = function (parameters, callback) {
        var t = this;
        return $http.post(prefix + modelName, parameters).then(function (response) {
          if (response.status === 201) {
            return t.findById(response.data.id, callback);
          } else {
            throw new Error('HuntModel:' + response.status + ':' + response.data.message);
          }
        });
      };

      /**
       * @name AngularHuntModel.findOne
       * @param {object} parameters - query parameters to be used
       * @param {function} callback - optional callback(objectFound)
       * @description
       * Find first one of group of entities filtered by query dictionary
       * Returns promise resolved with this object.
       * Optionally calls a callback
       * @see AngularHuntModel.get
       * @returns {Promise}
       */

      Model.findOne = function (parameters, callback) {
        return $http.get(prefix + modelName + '?' + encodeQueryData(parameters))
          .then(function (response) {
            switch (response.status) {
            case 200:
              var ret;
              if (response.data.data && response.data.data[0]) {
                ret = new Model();
                ret.$code = 200;
                ret.$status = response.data.status;
                ret.$metadata = response.data.metadata;
                Object.keys(response.data.data[0]).map(function (k) {
                  if (response.data.data.hasOwnProperty(k)) {
                    ret[k] = response.data.data[k];
                  }
                });
                ret.$subscribe();
                if (typeof callback === 'function') {
                  callback(ret);
                }
                return ret;
              } else {
                ret = {};
                ret.$code = 200;
                ret.$status = response.data.status;
                ret.$metadata = response.data.metadata;
                return ret;
              }
              break;
            default:
              throw new Error('HuntModel:' + response.status + ':' + response.data.message);
            }
          });
      };
      /**
       * @name AngularHuntModel.get
       * @param {object} parameters - query parameters to be used
       * @param {function} callback - optional callback(objectFound)
       * @description
       * Find first one of group of entities filtered by query dictionary
       * Returns promise resolved with this object.
       * Optionally calls a callback
       * @see AngularHuntModel.findOne
       * @returns {Promise}
       */
      Model.get = Model.findOne;

      /**
       * @name AngularHuntModel#$save
       * @description
       * Saves object instance to backend.
       * Returns promise resolved with this object.
       * Optionally calls a callback
       * @returns {Promise}
       */
      Model.prototype.$save = function (callback) {
        var t = this;
        t.$saving = true;
        return $http.patch(prefix + modelName + '/' + this.id, this)
          .then(function () {
            t.$saving = false;
            if (typeof callback === 'function') {
              callback(t);
            }
            return t;
          }, function (errorRes) {
            if (errorRes.status === 400) {
              t.$saving = false;
              t.$validationErrors = errorRes.data.validationErrors;
            } else {
              throw new Error('HuntModel:' + errorRes.status + ':' + errorRes.data.message);
            }
          });
      };
      /**
       * @name AngularHuntModel#$remove
       * @description
       * Saves object instance to backend.
       * Returns promise resolved with this object.
       * Optionally calls a callback
       * @returns {Promise}
       */
      Model.prototype.$remove = function () {
        var t = this;
        t.$saving = true;
        return $http.delete(prefix + modelName, {})
          .then(function () {
            t.$saving = false;
            t.$deleted = true;
          });
      };
      /**
       * @name AngularHuntModel#$ngChange
       * @description
       * Monitors object changing and saves object instance to backend.
       * Returns promise resolved with this object.
       * @returns {Promise}
       */
      Model.prototype.$ngChange = function () {
        return this.$save();
      };
      /**
       * @name AngularHuntModel#$watch
       * @params {object} $scope
       * @description
       * Monitors object changing and saves object instance to backend.
       * Returns promise resolved with this object.
       * @returns {Promise}
       */
      Model.prototype.$watch = function ($scope, item) {
        var
          t = this;

        if (t.$metadata.canWrite === true) {
          var
            i,
            fields = t.$metadata.fieldsWritable.map(function (fw) {
              return item + '.' + fw;
            });
          $scope.$watchGroup(fields, function (n, o) {
            t.$saving = true;
            t
              .$unsubscribe()
              .$save()
              .then(function () {
                t.$subscribe();
                t.$saving = false;
              }, function (error) {
                console.log(error);
                console.log(o);
                for (i = 0; i <= t.$metadata.fieldsWritable.length; i = i + 1) {
                  t[t.$metadata.fieldsWritable[i]] = o[i];
                }
                console.log(t);
                t.$saving = false;
                t.$subscribe();
                //throw error;
              });
          });
        }
      };

      Model.prototype.$subscribe = function () {
        var t = this;
        if (t.$subscribeToken) {
          t.$subscribed = true;
          huntSocketIo.on(t.$subscribeToken.toString(), function (data) {
            if (data.delete === 'delete') {
              t.$deleted = true;
            }
            if (data.patch) {
              Object.keys(data.patch).map(function (p) {
                t[p] = data.patch[p].new;
              });
            }
          });
        }
        return t;
      };

      Model.prototype.$unsubscribe = function () {
        var t = this;
        if (t.$subscribeToken) {
          t.$subscribed = false;
          //todo
          //huntSocketIo.removeListener(t.$subscribeToken.toString());
        }
        return t;
      };

      return Model;
    };
  }])
  .factory('huntModel', ['$resource', function ($resource) {
    return function (modelName) {
      //https://stackoverflow.com/questions/13269882/angularjs-resource-restful-example
      //https://stackoverflow.com/questions/16387202/angularjs-resource-query-result-array-as-a-property
      //http://jsfiddle.net/wortzwei/bez79/
      return $resource('/api/v1/' + modelName + '/:id', {'id': '@id'}, {
        'query': {
          'method': 'GET',
          'transformResponse': function (data) {
            var wrappedResult = angular.fromJson(data);
            wrappedResult.data.$metadata = wrappedResult.metadata || {};
            return wrappedResult.data;
          },
          'isArray': true,
          'interceptor': {
            response: function (response) {
              response.resource.$metadata = response.data.$metadata;
              return response.resource;
            }
          }
        },
        'get': {
          'method': 'GET',
          'transformResponse': function (data) {
            var wrappedResult = angular.fromJson(data);
            if (typeof(wrappedResult.data) === 'undefined') {
              wrappedResult.data = {};
            }
            wrappedResult.data.$metadata = wrappedResult.metadata;
            return wrappedResult.data;
          },
          'interceptor': {
            response: function (response) {
              response.resource.$metadata = response.data.$metadata;
              return response.resource;
            }
          },
          'isArray': false
        },
        'create': {
          'method': 'POST',
          'transformResponse': function (data) {
            return angular.fromJson(data).data;
          },
          'isArray': false
        },
        'save': {
          'method': 'PATCH',
          'transformResponse': function (data) {
            return angular.fromJson(data).data;
          },
          'isArray': false
        },
        'delete': { //http://stackoverflow.com/questions/16167463/angular-js-delete-resource-with-parameter
          'method': 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          params: {id: '@id'}
        }
      });
    };
  }])
  .controller('notificationController', ['$scope', 'huntSocketIo', function ($scope, socket) {
    var le;
    $scope.flash = {
      'success': [],
      'info': [],
      'error': []
    };
    $scope.clock = '';
    setInterval(function () {
      le = huntErrors.pop();
      if (le !== undefined) {
        $scope.flash.error.push(le);
      }
    }, 100);

    socket.on('notify:flash_success', function (data) {
      $scope.flash.success.push(data);
    });
    socket.on('notify:flash_info', function (data) {
      $scope.flash.info.push(data);
    });
    socket.on('notify:flash_error', function (data) {
      $scope.flash.error.push(data);
    });
    socket.on('currentTime', function (data) {
      if (data.time) {
        $scope.clock = new Date(data.time).toLocaleTimeString();
      }
    });
  }])
  .
  factory('$exceptionHandler', function () {
    return function errorCatcherHandler(exception, cause) {
      //console.error('stack', exception.stack);
      console.log(cause + ':' + exception.message);
      //$rootScope.addError(exception.message);
      huntErrors.push(exception.message);

    };
  })
  //.config(function ($provide) {
  //  $provide.decorator('$exceptionHandler', function ($delegate, $injector) {
  //    return function (exception, cause) {
  //      var $rootScope = $injector.get('$rootScope');
  //      $rootScope.addError({message: 'Exception', 'reason': exception, 'cause': cause});
  //      console.log('Exception', exception, 'cause', cause);
  //      $delegate(exception, cause);
  //    };
  //  });
  //})
;
