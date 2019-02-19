var express = require('express');
var http = require('http')
var socketio = require('socket.io');
var mongojs = require('mongojs');

var db = mongojs('mongodb://test:test12@ds343895.mlab.com:43895/chatroom');
var app = express();
var server = http.Server(app);
var websocket = socketio(server);
server.listen(3000, () => console.log('listening on *:3000'));

var clients = {};
var users = {};

var chatId = 1;

websocket.on('connection', (socket) => {
    clients[socket.id] = socket;
    socket.on('userJoined', (userId) => onUserJoined(userId, socket));
    socket.on('message', (message) => onMessageReceived(message, socket));
});

function onUserJoined(userId, socket) {
  try {
    console.log("userId: ",userId," socket: ",socket)
    // The userId is null for new users.
    if (!userId) {
      var user = db.collection('users').insert({}, (err, user) => {
        socket.emit('userJoined', user._id);
        users[socket.id] = user._id;
        _sendExistingMessages(socket);
      });
    } else {
      users[socket.id] = userId;
      _sendExistingMessages(socket);
    }
  } catch(err) {
    console.err(err);
  }
}

function onMessageReceived(message, senderSocket) {
  console.log("onMessageReceived === ",message)
  var userId = users[senderSocket.id];
  _sendAndSaveMessage(message, senderSocket);
}

function _sendExistingMessages(socket) {
  var messages = db.collection('messages')
    .find({ chatId })
    .sort({ createdAt: 1 })
    .toArray((err, messages) => {
      if (!messages.length) return;
      socket.emit('message', messages.reverse());
  });
}
function _sendAndSaveMessage(message, socket, fromServer) {


  console.log("_sendAndSaveMessage === ",message)
  // var messageData = {
  //   text: message.text ? message.text : null ,
  //   user: message.user,
  //   createdAt: new Date(message.createdAt),
  //   event: message.event ? message.event : null ,
  //   chatId: chatId
  // };

  if (message.text === '') return
  db.collection('messages').insert(message, (err, message) => {
    var emitter = fromServer ? websocket : socket.broadcast;

    emitter.emit('message', message);
  });
}
var stdin = process.openStdin();
stdin.addListener('data', function(d) {
  _sendAndSaveMessage({
    text: d.toString().trim(),
    createdAt: new Date(),
    user: { _id: 'robot' }
  }, null , true );
});
