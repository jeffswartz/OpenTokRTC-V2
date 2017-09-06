!(function (globals) {
  let debug;
  let _chromeExtId;
  let _isSharing;
  let _hasPendingOperation = false;
  const NAME_SUFFIX = '\'s screen';
  const DEFAULT_NAME = 'Unknown';
  let otHelper;
  let enableAnnotations = false;

  const screenPublisherOptions = {
    insertMode: 'append',
    width: '100%',
    height: '100%',
    name: 'screen',
    showControls: false,
    style: {
      nameDisplayMode: 'off',
    },
    publishAudio: false,
    videoSource: 'screen',
  };

  const streamHandlers = {
    destroyed(evt) {
      _isSharing = false;
      Utils.sendEvent('screenShareController:destroyed');
      enableAnnotations && Utils.sendEvent('screenShareController:annotationEnded');
    },
  };

  const roomViewEvents = {
    shareScreen(evt) {
      if (_hasPendingOperation) {
        return;
      }

      if (_isSharing) {
        otHelper.stopShareScreen();
        _isSharing = false;
        // We don't need to send this because desktop stream is sending a destroyed event.
      } else {
        const desktopElement = RoomView.createStreamView('desktop', {
          name: screenPublisherOptions.name,
          type: 'desktop',
          controlElems: {},
        });
        _hasPendingOperation = true;
        otHelper.shareScreen(desktopElement, screenPublisherOptions, streamHandlers,
                             enableAnnotations)
          .then(() => {
            _isSharing = true;
            _hasPendingOperation = false;
            Utils.sendEvent('screenShareController:changeScreenShareStatus',
                            { isSharing: _isSharing });
            enableAnnotations && Utils.sendEvent('screenShareController:annotationStarted');
          })
          .catch((error) => {
            _hasPendingOperation = false;
            if (error.code === OTHelper.screenShareErrorCodes.accessDenied) {
              RoomView.deleteStreamView('desktop');
            } else {
              Utils.sendEvent('screenShareController:shareScreenError',
                              { code: error.code, message: error.message });
            }
          });
      }
    },
  };

  const screenShareViewEvents = {
    installExtension(evt) {
      try {
        chrome.webstore.install(`https://chrome.google.com/webstore/detail/${_chromeExtId}`,
          () => {
            Utils.sendEvent('screenShareController:extInstallationResult',
                            { error: false });
          }, (err) => {
            Utils.sendEvent('screenShareController:extInstallationResult',
                            { error: true, message: err });
          });
      } catch (e) {
        // WARNING!! This shouldn't happen
        // If this message is displayed it could be because the extensionId is not
        // registred and, in this case, we have a bug because this was already controlled
        debug.error('Error installing extension:', e);
      }
    },
  };

  function init(aUserName, aChromeExtId, aOTHelper, aEnableAnnotations) {
    return LazyLoader.dependencyLoad([
      '/js/screenShareView.js',
    ]).then(() => {
      enableAnnotations = aEnableAnnotations;
      otHelper = aOTHelper;
      debug = new Utils.MultiLevelLogger('screenShareController.js',
                                         Utils.MultiLevelLogger.DEFAULT_LEVELS.all);

      Utils.addEventsHandlers('roomView:', roomViewEvents, globals);
      Utils.addEventsHandlers('screenShareView:', screenShareViewEvents, globals);
      _isSharing = false;
      screenPublisherOptions.name = (aUserName || DEFAULT_NAME) + NAME_SUFFIX;
      _chromeExtId = aChromeExtId;
      aChromeExtId && aChromeExtId !== 'undefined' &&
        OTHelper.registerScreenShareExtension({ chrome: aChromeExtId }, 1);
      ScreenShareView.init(aUserName);
    });
  }

  const ScreenShareController = {
    init,
    get chromeExtId() {
      return _chromeExtId;
    },
  };

  globals.ScreenShareController = ScreenShareController;
}(this));
