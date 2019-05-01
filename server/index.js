var express = require('express');
var http = require('http')
var socketio = require('socket.io');
var mongojs = require('mongojs');
const Joi = require('@hapi/joi');

var db = mongojs('mongodb://test:test12@ds343895.mlab.com:43895/chatroom');
var app = express();
var server = http.Server(app);
var websocket = socketio(server);
var port = process.env.PORT || 3000;
var bodyParser = require('body-parser');

server.listen(port, () => console.log(`listening on ${port}`));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var clients = {};
var users = {};

var chatId = 1;

websocket.on('connection', (socket) => {
    clients[socket.id] = socket;
    socket.on('userJoined', (user, room) => onUserJoined(user, room, socket));
    socket.on('message', (message) => onMessageReceived(message, socket));
});

function onUserJoined(user, room, socket) {
  try {
  var user = db.collection('users').insert({user: user, room: room}, (err, user) => {
      socket.join(room);
  });
    
  } catch(err) {
    console.err(err);
  }
}

function onMessageReceived(message, senderSocket) {
  console.log("onMessageReceived === ",message)
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
    //var emitter = fromServer ? websocket : socket.broadcast;

    socket.broadcast.to(message.room).emit('message', message);
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

app.get('/rooms', function(req, res) {
  db.collection('chatroom').find(function (err, chatrooms) {
    res.send({chatrooms});  
  })
  
});

// const schema = Joi.object().keys({
//   name: Joi.string().min(3).max(30).required(),
//   color: Joi.string().min(3).max(30),
//   avatarUrl: Joi.string().min(10).max(300)
// });

app.post('/rooms', function (req, res) {
  console.log(req.body);
  //const result = Joi.validate(req.body, schema);
  console.log(result);
  //if(result.error === null){
    db.collection('chatroom').insert(req.body, (err, chatroom) => {
      console.log(chatroom);
      res.status(200).send({chatroom});
    });
  // }else{
  //   res.status(422).send({error: 'format invalid'});
  // }
  
});
