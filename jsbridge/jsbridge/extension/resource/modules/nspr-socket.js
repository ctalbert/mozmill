/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Corporation Code.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Foundation
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Heather Arthur <fayearthur@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const DEBUG_ON = true;
const BUFFER_SIZE = 4096;
var nspr = {}; Components.utils.import("resource://jsbridge/modules/nspr.js", nspr);
var nsprTypes = nspr.nsprTypes;
nspr = nspr.nsprSockets;

var hwindow = Components.classes["@mozilla.org/appshell/appShellService;1"]
                .getService(Components.interfaces.nsIAppShellService)
                .hiddenDOMWindow;

var EXPORTED_SYMBOLS = ["ServerSocket"];
 
var ServerSocket = function(port) {
  var addr = nsprTypes.PRNetAddr();
  nspr.PR_SetNetAddr(nspr.PR_IpAddrLoopback, nspr.PR_AF_INET,
                     port, addr.address());

  var fd = nspr.PR_OpenTCPSocket(nspr.PR_AF_INET);

  // don't block for accept/send/recv
  var opt = nsprTypes.PRSocketOptionData();
  opt.non_blocking = nspr.PR_TRUE;
  opt.option = nspr.PR_SockOpt_Nonblocking;
  nspr.PR_SetSocketOption(fd, opt.address());
  
  // don't buffer when sending
  var opt = nsprTypes.PRSocketOptionData();
  opt.non_blocking = nspr.PR_TRUE; // same space
  opt.option = nspr.PR_SockOpt_NoDelay;
  nspr.PR_SetSocketOption(fd, opt.address());

  // allow local address re-use
  var opt = nsprTypes.PRSocketOptionData();
  opt.non_blocking = nspr.PR_TRUE; // same space
  opt.option = nspr.PR_SockOpt_Reuseaddr;
  nspr.PR_SetSocketOption(fd, opt.address());

  var status = nspr.PR_Bind(fd, addr.address());
  if(status != 0)
    throw "socket failed to bind, kill all firefox processes";

  var status = nspr.PR_Listen(fd, -1);
  if(status != 0)
    throw "socket failed to listen";

  this.addr = addr;
  this.fd = fd;
  log("jsbridge::NSPR Socket Setup");
}

ServerSocket.prototype = {
  onConnect : function(callback, interval) {
    interval = interval || 300;
    var that = this;
    (function accept() {
      var newfd = nspr.PR_Accept(that.fd, that.addr.address(), nspr.PR_INTERVAL_NO_WAIT);
      if(!newfd.isNull())
        callback(new Client(newfd));
      hwindow.setTimeout(accept, interval);
    })();
  },

  close : function() {
    log("jsbridge::NSPR socket closing"); 
    return nspr.PR_Close(this.fd); 
  }
}


var Client = function(fd) {
  this.fd = fd;
}

Client.prototype = {
  onMessage : function(callback, interval, bufsize) {
    bufsize = bufsize || BUFFER_SIZE;
    interval = interval || 100; // polling interval
    var that = this;
    dump("onMessage: starting up\n");

    /* OLD WAY */
    (function getMessage() {
      var buffer = new nspr.buffer(bufsize);
      var bytes = nspr.PR_Recv(that.fd, buffer, bufsize, 0, nspr.PR_INTERVAL_NO_WAIT);
      dump("jsbridge:onmessage recv bytes: " + bytes + "\n");
      if(bytes > 0) {
        var message = buffer.readString();
        dump("jsbridge: onMessage got message: " + message + "\n");
        callback(message);
      }
      else if(bytes == 0) {
        dump("jsbridge: bytes == 0! \n");
        if(that.handleDisconnect){
          dump("jsbridge: handling disconnect!\n");
          that.handleDisconnect();
        }
        dump("jsbridge: onMessage return from else\n");
        return;
      }
      dump("jsbridge: settimeout for getmessage\n");
      hwindow.setTimeout(getMessage, interval);
    })();
    /* NEW WAY */
    /*(function getMessage() {
      var message = '';
      var buffer = null;
      var bytesRemaining = 0;
      var currentbufsize = 0;
      var bytes = 0;
      
      // If bufsize = 0 then it hardly makes sense to read from the socket
      if (bufsize == 0) {
        log("jsbridge::NSPR getMessage, bufsize of 0, early return");
        return;
      }
      
      do { 
        log("jsbridge::NSPR onMessage: loop starting bufsize: " + bufsize);
        if (bufsize > BUFFER_SIZE) { 
          buffer = new nspr.buffer(BUFFER_SIZE);
          currentbufsize  = bufsize - BUFFER_SIZE;
        } else { 
          buffer = new nspr.buffer(bufsize);
          currentbufsize = bufsize;
        }

        // Read from the socket
        bytes = nspr.PR_Recv(that.fd, buffer, currentbufsize, 0, nspr.PR_INTERVAL_NO_WAIT);
        log("jsbridge::NSPR onMessage: bytes = " + bytes);
        if(bytes > 0) {
          message = message + buffer.readString();
          dump("jsbridge::NSPR onMessage got message: " + message + "\n");
        } else if (bytes == 0) {
          dump("jsbridge: bytes == 0\n");
          if (that.handleDisconnect) {
            log("jsbridge::NSPR onMessage handling disconnect");
            that.handleDisconnect();
          }
          log("jsbridge::NSPR onMessage return from else");
          return;
        }
        // Calculate how many bytes are remaining to be acquired
        bufsize = bufsize - currentbufsize;
        log("jsbridge::NSPR bufsize: " + bufsize + " and bytes: " + bytes);
      } while(0); //while( (bufsize > 0) && (bytes > 0));

      if (message) {
        log("jsbridge::NSPR onMessage: got data: " + message);
        callback(message);
      } 
      dump("jsbridge: setTimeout for getmessage\n");
      hwindow.setTimeout(getMessage, interval);
    })();*/
    dump("jsbridge: I'm not sure I get called\n");
  },

  onDisconnect : function(callback) {
    log("jsbridge::NSPR onDisconnect");
    this.handleDisconnect = callback;
  },

  sendMessage : function(message) {
    var msgoffset = 0;
    log("jsbridge::NSPR starting sendmessage of size: " + message.length);
    do {
      var parts = '';
      if (message.length > BUFFER_SIZE) {
        parts = message.slice(msgoffset, msgoffset + BUFFER_SIZE);
      } else {
        parts = message;
      }
      log("jsbridge::NSPR sending message with msgoffset: " + msgoffset);
      log("jsbridge::NSPR sending message with part length: " + parts.length);
      // Make our buffer
      var buffer = new nspr.buffer(parts);
      
      // Update the offset
      msgoffset += parts.length;
  
      log("jsbridge::NSPR sendMessage, sending: " + parts);
      nspr.PR_Send(this.fd, buffer, parts.length, 0, nspr.PR_INTERVAL_NO_WAIT);
    } while (msgoffset < message.length);
  },

  close : function() {
    return nspr.PR_Close(this.fd);
  }
}

function log(msg) {
  if (DEBUG_ON) {
    dump(msg + "\n");
  }
}
