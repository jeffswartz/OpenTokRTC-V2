!(function (exports) {
  let shareError;
  let _userName;

  const screenShareCtrlEvents = {
    shareScreenError: launchShareError,
    extInstallationResult,
    destroyed: destroyView,
  };

  function destroyView() {
    RoomView.deleteStreamView('desktop');
  }

  function init(aUserName) {
    _userName = aUserName;
    shareError = document.querySelector('.screen-modal');

    const installLink = shareError.querySelector('#screenShareErrorInstall button');
    installLink.addEventListener('click', (evt) => {
      hideShareScreenError();
      Utils.sendEvent('screenShareView:installExtension');
    });
    Utils.addEventsHandlers('screenShareController:', screenShareCtrlEvents, exports);
  }

  function launchShareError(evt) {
    destroyView();

    const status = evt.detail;
    const errCodes = OTHelper.screenShareErrorCodes;
    // Only if we really want to differentiate type of errors
    // or show differents section or something like that
    if (status.code === errCodes.accessDenied) {
      showError('Error', status.message);
    } else if (status.code === errCodes.extNotInstalled) {
      showInstallExtension();
    } else {
      showError('Sharing screen failed.', status.message);
    }
  }

  function showInstallExtension() {
    showShareScreenError('error-installing');
  }

  function showError(title, description) {
    function loadModalText() {
      shareError.querySelector('.errorTitle').textContent = title;
      shareError.querySelector('.errorDescription').textContent = description;
    }
    showShareScreenError('error-sharing', loadModalText);
  }

  function extInstallationResult(evt) {
    const status = evt.detail;
    if (status.error) {
      showError('Installation failed.', status.message);
    } else {
      showInstallationSuccess();
    }
  }

  function showInstallationSuccess() {
    const btnCancel = shareError.querySelector('#scrShrLater');
    const btnReload = shareError.querySelector('#scrShrReload');

    btnCancel.addEventListener('click', function btnCancelReload(evt) {
      btnCancel.removeEventListener('click', btnCancelReload);
      hideShareScreenError();
    });

    btnReload.addEventListener('click', function btnConfirmReload(evt) {
      btnReload.removeEventListener('click', btnConfirmReload);
      const location = document.location;
      let href = location.href;
      if (href.indexOf('?userName=') < 0) {
        const params = Utils.parseSearch(document.location.search).params;
        params.userName = _userName;
        const search = Utils.generateSearchStr(params);
        href = `${location.protocol}//${location.hostname}:${location.port
               }${location.pathname}${search}`;
      }
      window.location.href = href;
    });

    showShareScreenError('successful-installation');
  }

  function onClick(e) {
    if (e.target.id !== 'screenShareErrors') {
      return;
    }

    hideShareScreenError();
  }

  function hideShareScreenError(e) {
    shareError.removeEventListener('click', onClick);
    Modal.hide('.screen-modal').then(() => {
      shareError.data('screenSharingType', null);
    });
  }

  function showShareScreenError(type, preLoad) {
    function loadModalText() {
      preLoad && preLoad();
      shareError.data('screenSharingType', type);
    }
    Modal.show('.screen-modal', loadModalText).then((e) => {
      shareError.addEventListener('click', onClick);
    });
  }

  exports.ScreenShareView = {
    init,
  };
}(this));
