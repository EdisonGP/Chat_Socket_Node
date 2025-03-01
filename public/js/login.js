$(function () {
  var $usernameInput = $('#usernameInput'); // Input para el nombre de usuario
  var $btnLogin = $('#btnLogin'); // Botón de inicio de sesión
  var socket = io(); // Conexión con el servidor Socket.IO

  // Botón "Iniciar Sesión"
  $btnLogin.on('click', function () {
    setUsername();
  });

  // Establece el nombre de usuario del cliente
  function setUsername() {
    var username = cleanInput($usernameInput.val().trim()); // Obtiene el valor del input y lo limpia

    // Si el nombre de usuario es válido
    if (username) {
      socket.emit('exists user', username, function (cbValue) {
        if (cbValue) {
          sessionStorage.setItem('username', username);  // Guarda el nombre de usuario en sessionStorage
          socket.emit('add user', username);             // Notifica al servidor el nombre de usuario
          
          // Escucha el evento 'login' cuando el usuario ha sido registrado correctamente
          socket.on('login', function (data) {
            sessionStorage.setItem('connected', true); // Guarda el estado de conexión en sessionStorage
            window.location.href = 'chat.html'; // Redirige al usuario a la página del chat
          });

        } else {
          alert('El usuario "' + username + '" ya existe. Por favor, elige otro.');
          $usernameInput.val(''); // Limpia el input
        }
      });
    } else {
      alert('Por favor, ingresa un nombre de usuario.');
    }
  }

  // Limpia el texto de entrada para evitar inyecciones de HTML
  function cleanInput(input) {
    return $('<div/>').text(input).text();
  }

});
