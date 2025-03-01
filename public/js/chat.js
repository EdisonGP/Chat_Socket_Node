$(function () {
    // Constantes de configuración
    var FADE_TIME = 150; // Tiempo de animación para desvanecer mensajes (en milisegundos)
    var TYPING_TIMER_LENGTH = 400; // Tiempo para detectar cuando el usuario deja de escribir (en milisegundos)
    var COLORS = [
      '#e21400', '#91580f', '#f8a700', '#f78b00',
      '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
      '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ];
  
    // Inicialización de variables
    var $messages = $('.messages'); // Área donde se muestran los mensajes
    var $inputMessage = $('.inputMessage'); // Input para escribir mensajes
    var $btnSend = $('.btn-send'); // Botón para enviar mensajes
    var $btnLogout = $('#btn-logout'); // Botón de logout
    var $userCount = $('#user-count'); // Elemento para mostrar el número de usuarios
    var $activeUsers = $('#active-users'); // Contenedor para los usuarios activos
    var $typingIndicator = $('#typing-indicator'); // Indicador de que alguien está escribiendo
  
    var username = sessionStorage.getItem('username'); // Nombre de usuario almacenado en sessionStorage
    var connected = sessionStorage.getItem('connected');; // Indica si el usuario está conectado al chat
    var typing = false; // Indica si el usuario está escribiendo
    var lastTypingTime; // Última vez que el usuario escribió algo
  
    var socket = io(); // Conexión con el servidor Socket.IO

     // Solicitar la lista inicial de usuarios al conectarse
    socket.emit('get users');
   
    // Recibir la lista actualizada de usuarios
    socket.on('users list', function (data) {
      if (!data.users || typeof data.users !== 'object') {
        console.error("Error: data.users no es un objeto válido", data.users);
        return;
      }
    
      var usersWithoutMe = Object.values(data.users).filter(user => user !== username);
      addParticipantsMessage(usersWithoutMe);
    });
  
    // Eventos del servidor
    socket.emit('add user', username);

    socket.on('login', function (data) {
      if (data.users) {
        addParticipantsMessage(data.users);
      }
    });
  
    socket.on('new message', function (data) {
      addChatMessage(data);
    });
  
    socket.on('user joined', function (data) {
      if (data.users) {
        addParticipantsMessage(data.users);
      } else {
        console.error("No se recibió lista de usuarios en 'user joined'");
      }
    });
  
    socket.on('user left', function (data) {
      if (data.users) {
        addParticipantsMessage(data.users);
      } else {
        $userCount.text(data.numUsers || 0);
      }
      removeChatTyping(data);
    });
  
    socket.on('typing', function (data) {
      addChatTyping(data);
    });
  
    socket.on('stop typing', function (data) {
      removeChatTyping(data);
    });
    
  
    // Verifica si el usuario tiene un nombre de usuario guardado
    if (!username) {
      window.location.href = 'login.html';
    }
  
    // Función para actualizar el número de participantes
    function addParticipantsMessage(users) {
      // Si users es un array, actualiza el contador
      if (Array.isArray(users)) {
        $userCount.text(users.length);
        updateActiveUsersList(users);
      } 
      // Si users es un objeto, extraemos los valores y filtramos el usuario actual
      else if (typeof users === 'object') {
        const userArray = Object.values(users).filter(user => user !== username);
        $userCount.text(userArray.length);
        updateActiveUsersList(userArray);
      }
    }
  
    // Función para actualizar la lista de usuarios activos
    function updateActiveUsersList(users) {
      $activeUsers.empty();
      
      // Si users es un array, iteramos directamente
      if (Array.isArray(users)) {
        users.forEach(function(userName) {
          if (userName && userName !== username) {
            const userColor = getUsernameColor(userName);
            
            const $userElement = $(`
              <div class="active-user">
                <div class="user-avatar" style="background-color: ${userColor}">
                  ${userName.charAt(0).toUpperCase()}
                </div>
                <div class="user-name">${userName}</div>
              </div>
            `);
            
            $activeUsers.append($userElement);
          }
        });
      } 
      // Si users es un objeto, procesamos sus valores
      else if (typeof users === 'object') {
        Object.values(users).forEach(function(userName) {
          if (userName && userName !== username) {
            const userColor = getUsernameColor(userName);
            
            const $userElement = $(`
              <div class="active-user">
                <div class="user-avatar" style="background-color: ${userColor}">
                  ${userName.charAt(0).toUpperCase()}
                </div>
                <div class="user-name">${userName}</div>
              </div>
            `);
            
            $activeUsers.append($userElement);
          }
        });
      }
    }
  
    // Envía un mensaje al chat
    function sendMessage() {
      var message = $inputMessage.val();
      message = cleanInput(message); // Limpia el mensaje para evitar inyecciones de HTML
      
      // Asegúrate de que connected está sincronizado 
      if (message && connected) {
        $inputMessage.val(''); // Limpia el input
        addChatMessage({
          username: username,
          message: message,
          isMyMessage: true
        });
        socket.emit('new message', message); // Notifica al servidor el nuevo mensaje
      }
    }
  
    // Agrega un mensaje de chat visual al área de mensajes
    function addChatMessage(data, options) {
      var $typingMessages = getTypingMessages(data);
      options = options || {};
  
      if ($typingMessages.length !== 0) {
        options.fade = false;
        $typingMessages.remove();
      }
  
      // Determinar si es mi mensaje
      const isMyMessage = data.isMyMessage || data.username === username;
      const userColor = getUsernameColor(data.username);
  
      // Crear el mensaje
      const $messageItem = $('<li>').addClass('message');
      
      if (isMyMessage) {
        $messageItem.addClass('my-message');
      }
  
      // Crear el div de nombre de usuario
      const $usernameDiv = $('<span>')
        .addClass('message-username')
        .text(data.username)
        .css('color', userColor)
        .css('font-weight', 'bold');
  
      // Crear el div de contenido del mensaje
      const $messageContentDiv = $('<div>')
        .addClass('message-content')
        .text(data.message);
  
      // Crear el div de hora
      const $messageTimeDiv = $('<div>')
        .addClass('message-time')
        .text(formatTime(new Date()));
  
      // Agregar todo al mensaje
      $messageItem.append($usernameDiv, $messageContentDiv, $messageTimeDiv);
      addMessageElement($messageItem, options);
    }
  
    // Formatea la hora actual
    function formatTime(date) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    // Agrega un elemento de mensaje al área de mensajes y desplaza hacia abajo
    function addMessageElement(el, options) {
      var $el = $(el);
      options = options || {};
  
      if (typeof options.fade === 'undefined') {
        options.fade = true;
      }
      if (typeof options.prepend === 'undefined') {
        options.prepend = false;
      }
  
      if (options.fade) {
        $el.hide().fadeIn(FADE_TIME);
      }
      if (options.prepend) {
        $messages.prepend($el);
      } else {
        $messages.append($el);
      }
      
      // Scroll to bottom
      $('.chatArea')[0].scrollTop = $('.chatArea')[0].scrollHeight;
    }
  
    // Limpia el texto de entrada para evitar inyecciones de HTML
    function cleanInput(input) {
      return $('<div/>').text(input).text();
    }
  
      // Agrega un mensaje de "está escribiendo" al chat
    function addChatTyping(data) {
      $('#typing-username').text(data.username);
      $typingIndicator.show();
    }

    // Elimina el mensaje de "está escribiendo" del chat
    function removeChatTyping(data) {
      $typingIndicator.hide();
    }
    
      // Evento para detectar cuando el usuario está escribiendo
      $inputMessage.on('input', function () {
        updateTyping();
      });

    // Actualiza el estado de "está escribiendo"
    function updateTyping() {
      if (connected) {
        if (!typing) {
          typing = true;
          socket.emit('typing');
        }
        lastTypingTime = new Date().getTime();
  
        setTimeout(function () {
          var typingTimer = new Date().getTime();
          var timeDiff = typingTimer - lastTypingTime;
          if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
            socket.emit('stop typing');
            typing = false;
          }
        }, TYPING_TIMER_LENGTH);
      }
    }
  
    // Obtiene los mensajes de "está escribiendo" de un usuario específico
    function getTypingMessages(data) {
      return $('.typing.message').filter(function (i) {
        return $(this).data('username') === data.username;
      });
    }
  
    // Obtiene el color de un nombre de usuario mediante una función hash
    function getUsernameColor(username) {
      // Validar que username sea una cadena de texto válida
      if (!username || typeof username !== 'string' || username.trim() === '') {
        username = 'Anonymous'; // Usar un valor predeterminado si el nombre de usuario no es válido
      }
      
      var hash = 7;
      for (var i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + (hash << 5) - hash;
      }
      var index = Math.abs(hash % COLORS.length);
      return COLORS[index];
    }

     
    // Evento para el botón de enviar mensajes
    $btnSend.on('click', function () {
      sendMessage();
      socket.emit('stop typing');
      typing = false;
    });
  
    // Evento para el botón logout
    $btnLogout.on('click', function () {
      socket.emit('user logout', username);
      sessionStorage.removeItem('username');
      sessionStorage.removeItem('connected');
      window.location.href = 'index.html';
    });
  });