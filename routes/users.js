/*jshint node:true, laxcomma:true, indent:2, eqnull:true, es5:true */

'use strict';

var db = require('nano')(process.env.DATABASE_URL)
  , async = require('async')
  , sugar = require('sugar')
  , moment = require('moment')
  , clog = require('clog')
  , tmp = require('tmp')
  , unzip = require('unzip')
  , uuid = require('node-uuid');

require('sugar');
moment.lang('it');


function usersList(req, res, next) {
  
  db.view('lms', 'users', { include_docs: true }, function (err, doc) {
    if (err) {
      return next(err);
    }
    
    res.render('users_list', {
      users: doc.rows
    , moment: moment
    });
  });
}


function usersForm(req, res, next) {
  var user_id = req.param('id') || undefined;
  
  async.waterfall([
    
    function (done) {
      if (user_id) {
        db.get(user_id, function (err, doc) {
          done(err, doc);
        });
      } else {
        done(null, {});
      }
    },
    
    function (doc, done) {
      res.render('users_add', {
        message: req.flash('message')
      , errors: req.flash('errors')
      , pagina: doc
      });
      done();
    }
    
  ], function (err) {
    if (err) {
      return next(err);
    }
  });
}


function userUpdate(req, res, next) {
  var data = {
      type: 'user'
    , created_on: new Date()
    , enabled: true
    , name: req.param('name')
    , email: req.param('email')
    , company: req.param('company')
    , description: req.param('description')
    , language: req.param('language')
    , username: req.param('username')
    , password: req.param('password')
    , _id: req.param('_id') || undefined
    , _rev: req.param('_rev') || undefined
    }
    , errors = [];
  
  clog.debug('Saving user...');
  db.insert(data, data._id, function (err, body) {
    if (err) {
      return next(err);
    }
    
    req.flash('message', 'L\'utente è stato salvato correttamente.');
    
    clog.ok('Corso salvato correttamente (id: {0}, rev: {1})'.format(body.id, body.rev));
    res.redirect('/users');
  });
}


function userToggleForm(req, res, next) {
  var id = req.param('id');
  
  db.get(id, function (err, doc) {
    if (err) {
      return next(err);
    }
    
    res.render('users_disable', { 
      doc: doc
    , message: req.flash('message')
    });
  });
}


function userToggle(req, res, next) {
  var _id = req.param('_id')
    , enabled = (req.param('enabled') === 'yes') ? true : false;
  
  db.atomic('lms', 'enabledisable', _id, { enabled: enabled }, function (err, body) {
    if (err) {
      return next(err);
    }
    
    clog.info('User should be enabled. Message:', body);
    
    res.redirect('/users');
  });
}



module.exports = function (app) {
  var PREFIX = '/users';
  
  app.get(PREFIX, usersList);
  app.get(PREFIX + '/form', usersForm);
  app.get(PREFIX + '/form/:id', usersForm);
  app.post(PREFIX, userUpdate);
  app.get(PREFIX + '/disable/:id', userToggleForm);
  app.put(PREFIX + '/disable', userToggle);  
};
 
 