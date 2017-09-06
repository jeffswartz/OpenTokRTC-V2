!(function (exports) {
  let usrId;

  let closeChatBtn;
  let headerChat;
  let sendMsgBtn;
  let chatMsgInput;
  let chatContainer;
  let chatContent;
  let chatForm;

  let _visibilityChanging = Promise.resolve();

  function isVisible() {
    return _visibilityChanging.then(() => Chat.visible);
  }

  function setVisibility(isVisible) {
    if (isVisible) {
      addHandlers();
      return Chat.show().then(() => {
        scrollTo();
      });
    }
    removeHandlers();
    return Chat.hide();
  }

  let eventHandlers;

  function addEventsHandlers(configuredEvts) {
    eventHandlers = {
      incomingMessage: {
        name: 'chatController:incomingMessage',
        handler(evt) {
          const data = evt.detail.data;
          insertChatLine(data);
          isVisible().then((visible) => {
            if (!visible) {
              Utils.sendEvent('chatView:unreadMessage', { data });
            }
          });
        },
      },
      presenceEvent: {
        name: 'chatController:presenceEvent',
        handler(evt) {
          insertChatEvent(evt.detail);
        },
      },
      messageDelivered: {
        name: 'chatController:messageDelivered',
        handler(evt) {
          chatMsgInput.value = '';
        },
      },
      chatVisibility: {
        name: 'roomView:chatVisibility',
        handler(evt) {
          _visibilityChanging = setVisibility(evt.detail);
        },
        couldBeChanged: true,
      },
    };
    Array.isArray(configuredEvts) && configuredEvts.forEach((aEvt) => {
      const event = eventHandlers[aEvt.type];
      event && event.couldBeChanged && (event.name = aEvt.name);
    });
    Utils.addHandlers(eventHandlers);
  }

  function initHTMLElements() {
    const chatWndElem = document.getElementById('chat');
    headerChat = chatWndElem.querySelector('header');
    closeChatBtn = chatWndElem.querySelector('#closeChat');
    sendMsgBtn = chatWndElem.querySelector('#sendTxt');
    chatMsgInput = chatWndElem.querySelector('#msgText');
    chatContainer = chatWndElem.querySelector('#chatMsgs');
    chatContent = chatContainer.querySelector('ul');
    chatForm = chatWndElem.querySelector('#chatForm');
  }

  const onSendClicked = function (evt) {
    evt.preventDefault();
    if (!chatMsgInput.value.trim().length) {
      return;
    }
    Utils.sendEvent('chatView:outgoingMessage', {
      sender: usrId,
      time: Utils.getCurrentTime(),
      text: chatMsgInput.value.trim(),
    });
  };

  const onKeyPress = function (myfield, evt) {
    let keycode;
    if (window.vent) {
      keycode = window.event.keyCode;
    } else if (evt) {
      keycode = evt.which;
    } else {
      return true;
    }
    if (keycode === 13) {
      onSendClicked(evt);
      return false;
    }
    return true;
  }.bind(undefined, chatMsgInput);

  const onSubmit = function (evt) {
    evt.preventDefault();
    return false;
  };

  const onClose = function (evt) {
    evt.preventDefault();
    evt.stopImmediatePropagation();
    _visibilityChanging = setVisibility(false);
  };

  const onToggle = function (evt) {
    Chat.isCollapsed() ? Chat.expand() : Chat.collapse();
  };

  const onDrop = function (evt) {
    evt.preventDefault();
    evt.stopPropagation();
    return false;
  };

  // The ChatController should have the handlers and call the view for
  // doing visual work
  function addHandlers() {
    chatForm.addEventListener('keypress', onKeyPress);
    chatForm.addEventListener('submit', onSubmit);
    chatForm.addEventListener('drop', onDrop);
    closeChatBtn.addEventListener('click', onClose);
    headerChat.addEventListener('click', onToggle);
    sendMsgBtn.addEventListener('click', onSendClicked);
  }

  function removeHandlers() {
    chatForm.removeEventListener('keypress', onKeyPress);
    closeChatBtn.removeEventListener('click', onClose);
    headerChat.removeEventListener('click', onToggle);
    sendMsgBtn.removeEventListener('click', onSendClicked);
    chatForm.removeEventListener('drop', onDrop);
  }

  function insertChatEvent(data) {
    data.time = data.time || Utils.getCurrentTime();
    insertChatLine(data);
  }

  function insertText(elemRoot, text) {
    const txtElems = TextProcessor.parse(text);
    const targetElem = HTMLElems.createElementAt(elemRoot, 'p');
    txtElems.forEach((node) => {
      switch (node.type) {
        case TextProcessor.TYPE.URL:
          HTMLElems.createElementAt(targetElem, 'a',
            { href: node.value, target: '_blank' }, node.value);
          break;
        default:
          HTMLElems.addText(targetElem, node.value);
      }
    });
  }

  function insertChatLine(data) {
    const item = HTMLElems.createElementAt(chatContent, 'li');

    const info = HTMLElems.createElementAt(item, 'p');
    if ((data.sender || data.userName) === usrId) {
      info.classList.add('yourself');
    }
    const time = data.time.toLowerCase();
    HTMLElems.createElementAt(info, 'span', null, time).classList.add('time');
    HTMLElems.createElementAt(info, 'span', null, data.sender || data.userName)
              .classList.add('sender');

    insertText(info, data.text);

    scrollTo(item);
  }

  function scrollTo(item) {
    item = item || chatContent.lastChild;
    chatContainer.scrollTop = chatContent.offsetHeight + item.clientHeight;
  }

  function init(aUsrId, aRoomName, configuredEvts) {
    return LazyLoader.dependencyLoad([
      '/js/helpers/textProcessor.js',
      '/js/components/chat.js',
    ]).then(() => {
      initHTMLElements();
      usrId = aUsrId;
      Chat.init();
      addEventsHandlers(configuredEvts);
    });
  }

  const ChatView = {
    init,
  };

  exports.ChatView = ChatView;
}(this));
