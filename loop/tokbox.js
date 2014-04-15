/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var OpenTok = require('opentok');
var crypto = require('crypto');
var request = require('request');
var conf = require('./config').conf;

function TokBox(settings) {
  this.serverIP = settings.serverIP;
  this.apiKey = settings.apiKey;
  this.tokenDuration = settings.tokenDuration;
  this._opentok = new OpenTok.OpenTokSDK(this.apiKey, settings.apiSecret);
}

TokBox.prototype = {
  getSessionTokens: function(cb) {
    var self = this;
    this._opentok.createSession(
      this.serverIP, {'p2p.preference':'enabled'}, function(err, sessionId) {
        if (err || sessionId === undefined || sessionId === null) {
          cb(err || new Error("Got an empty sessionId from tokbox, check " +
                              "your credentials."));
          return;
        }
        var now = Math.round(new Date().getTime() / 1000.0);
        var expirationTime = now + self.tokenDuration;
        cb(null, {
          sessionId: sessionId,
          callerToken: self._opentok.generateToken({
            session_id: sessionId,
            role: OpenTok.RoleConstants.PUBLISHER,
            expire_time: expirationTime
          }),
          calleeToken: self._opentok.generateToken({
            session_id: sessionId,
            role: OpenTok.RoleConstants.PUBLISHER,
            expire_time: expirationTime
          })
        });
      }
    );
  }
};

function FakeTokBox() {
  this._counter = 0;
}

FakeTokBox.prototype = {
  _urlSafeBase64RandomBytes: function(number_of_bytes) {
    return crypto.randomBytes(number_of_bytes).toString('base64')
                 .replace(/\+/g, '-').replace(/\//g, '_');
  },
  _fakeSessionId: function() {
    this._token = 0;
    this._counter += 1;
    return this._counter + '_' + this._urlSafeBase64RandomBytes(51);

  },
  _generateFakeToken: function() {
    this._token += 1;
    return 'T' + this._token + '==' + this._urlSafeBase64RandomBytes(293);
  },
  getSessionTokens: function(cb) {
    var self = this;
    // Do a real HTTP call to have a realistic behavior
    request.get(conf.get("fakeTokBoxURL"), function(err) {
      cb(err, {
        sessionId: self._fakeSessionId(),
        callerToken: self._generateFakeToken(),
        calleeToken: self._generateFakeToken()
      });
    });
  }
};

module.exports = {
  TokBox: TokBox,
  FakeTokBox: FakeTokBox,
  OpenTok: OpenTok,
  request: request
};
