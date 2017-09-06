!(function (exports) {
  let archives = null;
  const listeners = {};

  function init(aUrl, aToken) {
    const self = this;
    return LazyLoader.dependencyLoad([
      'https://cdn.firebase.com/js/client/2.3.1/firebase.js',
    ]).then(() => new Promise((resolve, reject) => {
        // url points to the session root
      const sessionRef = new Firebase(aUrl);
      sessionRef.authWithCustomToken(aToken, () => {
        const archivesRef = sessionRef.child('archives');
        archivesRef.on('value', (snapshot) => {
          const handlers = listeners.value;
          archives = snapshot.val();
          const archiveValues = Promise.resolve(archives || {});
          handlers && handlers.forEach((aHandler) => {
            archiveValues.then(aHandler.method.bind(aHandler.context));
          });
        }, (err) => {
            // We should get called here only if we lose permission...
            // which should only happen if the branch is erased.
          const handlers = listeners.value;
          console.error('Lost connection to Firebase. Reason: ', err); // eslint-disable-line no-console
          const archiveValues = Promise.resolve({});
          handlers && handlers.forEach((aHandler) => {
            archiveValues.then(aHandler.method.bind(aHandler.context));
          });
        });
        sessionRef.child('connections').push(new Date().getTime()).onDisconnect().remove();
        resolve(self);
      });
    }));
  }

  function addEventListener(type, aHandler) {
    let context;
    if (!(type in listeners)) {
      listeners[type] = [];
    }

    let hd = aHandler;
    if (typeof hd === 'object') {
      context = hd;
      hd = hd.handleEvent;
    }

    if (hd) {
      listeners[type].push({
        method: hd,
        context,
      });
    }
  }

  function removeEventListener(type, aHandler) {
    if (!(type in listeners)) {
      return false;
    }
    const handlers = listeners[type];
    if (handlers) {
      for (let i = 0, l = handlers.length; i < l; i++) {
        let thisHandler = aHandler;
        if (typeof thisHandler === 'object') {
          thisHandler = aHandler.handleEvent;
        }
        if (handlers[i].method === thisHandler) {
          handlers.splice(i, 1);
          return true;
        }
      }
    }
    return false;
  }

  const FirebaseModel = {
    addEventListener,
    removeEventListener,
    init,
    get archives() {
      return archives;
    },
  };

  exports.FirebaseModel = FirebaseModel;
}(this));
