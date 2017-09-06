!(function (global) {
  const transEndEventName =
    ('WebkitTransition' in document.documentElement.style) ?
    'webkitTransitionEnd' : 'transitionend';

  const closeHandlers = {};

  const _queuedModals = [];
  let _modalShown = false;

  function addCloseHandler(selector) {
    const closeElement = document.querySelector(`${selector} .close`);
    if (!closeElement) {
      return;
    }

    const handler = Modal.hide.bind(Modal, selector);
    closeHandlers[selector] = {
      target: closeElement,
      handler,
    };

    closeElement.addEventListener('click', handler);
  }

  function removeCloseHandler(selector) {
    const obj = closeHandlers[selector];
    obj && obj.target.removeEventListener('click', obj.handler);
  }

  function show(selector, preShowCb) {
    let screenFree;
    if (!_modalShown) {
      screenFree = Promise.resolve();
    } else {
      screenFree = new Promise((resolve, reject) => {
        _queuedModals.push(resolve);
      });
    }

    return screenFree.then(() => new Promise((resolve, reject) => {
      _modalShown = true;
      preShowCb && preShowCb();
      const modal = document.querySelector(selector);
      modal.addEventListener(transEndEventName, function onTransitionend() {
        modal.removeEventListener(transEndEventName, onTransitionend);
        addCloseHandler(selector);
        resolve();
      });
      modal.classList.add('visible');
      modal.classList.add('show');
    }));
  }

  function hide(selector) {
    return new Promise((resolve, reject) => {
      const modal = document.querySelector(selector);

      modal.addEventListener(transEndEventName, function onTransitionend() {
        modal.removeEventListener(transEndEventName, onTransitionend);
        modal.classList.remove('visible');
        resolve();
      });
      removeCloseHandler(selector);
      modal.classList.remove('show');
    }).then(() => {
      _modalShown = false;
      const nextScreen = _queuedModals.shift();
      nextScreen && nextScreen();
    });
  }

  global.Modal = {
    show,
    hide,
  };
}(this));
