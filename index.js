var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom
// Variables de usuario ,los cuales estaran conectado
var usernames = {};
var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

   // Enviar la lista de usuarios cuando un cliente se conecta
   socket.emit('users list', { users: usernames });

   socket.on('get users', function () {
    socket.emit('users list', { users: usernames });
  });
   
  // Cuando el cliente emite 'nuevo mensaje', este escucha y ejecuta
  socket.on('new message', function (data) {
    // Este mensaje se emite a todos los participantes
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // Ingresa nuevo usuario al chat
  socket.on('exists user', function (username, cb){
    if( usernames.hasOwnProperty(username) )
    {
      console.log('User already exists!');
      cb(false);
    }
    else
    {
      console.log('User don\'t exist!');
      cb(true);
    }
  });

  // Cuando se agrega un nuevo usuario al chat, this listens and executes
  socket.on('add user', function (username) {
    // Almacenamos el nombre de usuario en la sesión de socket para este cliente
    socket.username = username;
    // Añade el nombre de usuario del cliente a la lista global
    usernames[socket.username] = username;
    ++numUsers;
    addedUser = true;
    
    socket.emit('login', {
      numUsers: numUsers,
      users: usernames  // Enviar lista completa al usuario que se conecta
    });
    
    // Comunica globalmente que una persona se ha conectado
    socket.broadcast.emit('user joined', {
      username: socket.username,
      users: usernames  // Enviar lista a todos los demás
    });
  });

  // Cuando el cliente emite 'typing', lo transmitimos a los demás
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // Cuando el cliente emite 'stop typing', lo transmitimos a los demás
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // Cuando el usuario se desconecta
  socket.on('disconnect', function () {
    // Elimina el nombre del usuario de la lista de usuarios
    if (addedUser) {
      delete usernames[socket.username];
      --numUsers;
  
      // Comunica globalmente que el usuario se ha ido
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers,
        users: usernames  // Añadir la lista actualizada de usuarios
      });
    }
  });
});