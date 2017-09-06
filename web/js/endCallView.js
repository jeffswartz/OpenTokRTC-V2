!(function (exports) {
  const VIDEO_EXT = 'mp4';
  const LIST_SELECTOR = '.videos.tc-list ul';
  const MAIN_PAGE = '/index.html';

  const _templateSrc = '/templates/endMeeting.ejs';
  let _template;
  let _model;
  let _sessionId;

  const addHandlers = function () {
    !exports.isWebRTCVersion && HTMLElems.addHandlerArchive(LIST_SELECTOR);
    const btn = document.getElementById('newCall');
    btn && btn.addEventListener('click', (evt) => {
      evt.preventDefault();
      evt.stopImmediatePropagation();
      window.location = window.location.origin + MAIN_PAGE;
    });
  };

  function render(archives) {
    const data = {
      archives: [],
    };
    const sortingDescending = function (a, b) {
      const tA = archives[a].createdAt;
      const tB = archives[b].createdAt;

      return tB - tA;
    };

    archives = archives || {};

    Object.keys(archives).sort(sortingDescending).forEach((archId) => {
      const archive = archives[archId];
      const anArch = {};
      // data for preview
      anArch.status = archive.status;
      anArch.hrefPrev = `${archive.localDownloadURL}?generatePreview`;
      anArch.txtPrev = Utils.getLabelText(archive);
      // data for delete
      anArch.id = archive.id;
      anArch.recordingUser = archive.recordingUser;
      // data for download
      anArch.hrefDwnld = archive.localDownloadURL;
      anArch.dwnldName = `${archive.name}.${VIDEO_EXT}`;
      data.archives.push(anArch);
    });
    data.numArchives = data.archives.length;
    data.sessionId = _sessionId;
    data.isWebRTCVersion = exports.isWebRTCVersion;

    _template.render(data).then((aHTML) => {
      document.body.innerHTML = aHTML;
      addHandlers();
    });
  }

  const eventHandlers = {
    'EndCallController:endCall': function (evt) {
      if (_model) {
        _model.addEventListener('value', render);
        render(_model.archives);
      } else {
        render();
      }
    },
  };

  let alreadyInitialized = false;

  exports.EJS = function (aTemplateOptions) {
    if (aTemplateOptions.url) {
      this._templatePromise =
        exports.Request.sendXHR('GET', aTemplateOptions.url, null, null, 'text')
          .then(aTemplateSrc => exports.ejs.compile(aTemplateSrc, { filename: aTemplateOptions.url }));
    } else {
      this._templatePromise = Promise.resolve(exports.ejs.compile(aTemplateOptions.text));
    }
    this.render = function (aData) {
      return this._templatePromise.then(aTemplate => aTemplate(aData));
    };
  };

  const init = function (model, sessionId) {
    _model = model;
    _sessionId = sessionId;
    if (alreadyInitialized) {
      return;
    }

    Utils.addEventsHandlers('', eventHandlers);
    _template = new exports.EJS({ url: _templateSrc });
    alreadyInitialized = true;
  };

  exports.EndCallView = {
    init,
  };
}(this));
