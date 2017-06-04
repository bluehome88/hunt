'use strict';

var
  winston = require('winston'),
  Sequelize = require('sequelize'),
  url = require('url');

module.exports = exports = function (core) {
  if (core.config.sequelizeUrl) {

    /**
     * @name Hunt#Sequilize
     * @description
     * {@link http://sequelizejs.com/ | SQL database object relational mapper constructor},
     * that is used only when config option of sequilizeUrl is defined.
     * @see config
     *
     */
    core.Sequelize = Sequelize;
    var
      sequelize,
      logger = function(sql){
        winston.silly('Sequelize query: %s',sql);
      },
      parameters = url.parse(core.config.sequelizeUrl);

    if (parameters) {
      switch (parameters.protocol) {
      case 'sqlite:':
        /*
         * @name Hunt#sequilize
         * @description
         * Sequilize instance with database connection string extracted from config object
         * @see Hunt#Sequilize
         */
        sequelize = new core.Sequelize(
          'databaseNameThatIsTotalyIgnored',
          'usernameThatNobodyCaresAbout',
          'passwordThatNobodyNeeds',
          {
            'dialect': 'sqlite',
            'storage': (parameters.path !== '/') ? parameters.path : ':memory:',
            'logging': logger
          }
        );
        winston.silly('ConfigManager: Sequilize is trying to use SQLite database...');
        break;
      case 'mysql:':
        sequelize = new core.Sequelize(
          parameters.path.split('/')[1],
          (parameters.auth) ? (parameters.auth.split(':')[0]) : null,
          (parameters.auth) ? (parameters.auth.split(':')[1]) : null,
          {
            'dialect': 'mysql',
            'host': parameters.hostname,
            'port': parameters.port,
            'logging': logger
          }
        );
        winston.silly('ConfigManager: Sequilize is trying to use MySQL database...');
        break;
      case 'postgres:':
        sequelize = new core.Sequelize(
          parameters.path.split('/')[1],
          (parameters.auth) ? (parameters.auth.split(':')[0]) : null,
          (parameters.auth) ? (parameters.auth.split(':')[1]) : null,
          {
            'dialect': 'postgres',
            'host': parameters.hostname,
            'port': parameters.port,
            'logging': logger
          }
        );
        winston.silly('ConfigManager: Sequilize is trying to use PostgreSQL database...');
        break;
      default :
        throw new Error('Unable to parse sequelizeUrl with value of ' + core.config.sequelizeUrl + ' - unknown protocol ' + parameters.protocol);
      }
      core.sequelize = sequelize;

      core.sequelize.authenticate().then(function () {
        winston.debug('Process %s established connection to %s//%s/%s',
          process.pid,
          parameters.protocol,
          parameters.host,
          parameters.path.split('/')[1]
        );
      });
    } else {
      throw new Error('Unable to parse sequelizeUrl with value of ' + core.config.sequelizeUrl);
    }
  }
};
