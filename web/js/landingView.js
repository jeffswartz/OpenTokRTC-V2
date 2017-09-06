!(function (global) {
  let room,
    enterButton;

  const init = function () {
    enterButton = document.getElementById('enter');
    room = document.getElementById('room');
    resetForm();
    addHandlers();
    if (window.location.hostname.indexOf('opentokrtc.com') === 0) {
      document.querySelector('.safari-plug').style.display = 'block';
    }
  };

  const isValid = function () {
    let formValid = true;

    const fields = document.querySelectorAll('form input.required');

    Array.prototype.map.call(fields, (field) => {
      const errorMessage = document.querySelector(`.error-${field.id}`);
      const valid = field.type === 'checkbox' ? field.checked : field.value.trim();
      valid ? errorMessage.classList.remove('show') : errorMessage.classList.add('show');
      formValid = formValid && valid;
    });

    return formValid;
  };

  var resetForm = function () {
    const fields = document.querySelectorAll('form input');
    Array.prototype.map.call(fields, (field) => {
      field.value = '';
      field.checked = false;
    });
  };

  const showContract = function () {
    const selector = '.tc-modal.contract';
    const ui = document.querySelector(selector);

    return Modal.show(selector)
      .then(() => new Promise((resolve, reject) => {
        ui.addEventListener('click', function onClicked(evt) {
          const classList = evt.target.classList;
          const hasAccepted = classList.contains('accept');
          if (!hasAccepted && !classList.contains('close')) {
            return;
          }
          evt.stopImmediatePropagation();
          evt.preventDefault();
          ui.removeEventListener('click', onClicked);
          Modal.hide(selector).then(() => { resolve(hasAccepted); });
        });
      }));
  };

  const navigateToRoom = function () {
    const base = window.location.href.replace(/([^/]+)\.[^/]+$/, '');
    let url = base.concat('room/', room.value);
    const userName = document.getElementById('user').value.trim();
    if (userName) {
      url = url.concat('?userName=', userName);
    }
    resetForm();
    window.location.href = url;
  };

  var addHandlers = function () {
    enterButton.addEventListener('click', function onEnterClicked(event) {
      event.preventDefault();
      event.stopImmediatePropagation();

      const form = document.querySelector('form');
      if (!isValid()) {
        form.classList.add('error');
        return;
      }

      form.classList.remove('error');
      enterButton.removeEventListener('click', onEnterClicked);

      if (isWebRTCVersion) {
        showContract().then((accepted) => {
          if (accepted) {
            navigateToRoom();
          } else {
            addHandlers();
          }
        });
      } else {
        navigateToRoom();
      }
    });
  };

  global.LandingView = {
    init,
  };
}(this));
