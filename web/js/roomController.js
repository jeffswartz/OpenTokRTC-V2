/* global Utils, Request, RoomStatus, RoomView, LayoutManager, Modal, LazyLoader,
          EndCallController, ChatController, LayoutMenuController, RecordingsController,
          ScreenShareController, FeedbackController */
!(function (exports) {
  const debug =
    new Utils.MultiLevelLogger('roomController.js', Utils.MultiLevelLogger.DEFAULT_LEVELS.all);

  let otHelper;
  let numUsrsInRoom = 0;
  let _disabledAllVideos = false;
  let enableAnnotations = true;
  let enableHangoutScroll = false;
  let enableArchiveManager = false;

  let setPublisherReady;
  const publisherReady = new Promise((resolve, reject) => {
    setPublisherReady = resolve;
  });

  const STATUS_KEY = 'room';
  let _sharedStatus = {
    roomMuted: false,
  };

  let userName = null;
  let roomName = null;
  let resolutionAlgorithm = null;
  let debugPreferredResolution = null;

  const publisherOptions = {
    insertMode: 'append',
    width: '100%',
    height: '100%',
    showControls: true,
    resolution: '1280x720',
    style: {
      audioLevelDisplayMode: 'auto',
      buttonDisplayMode: 'off',
      nameDisplayMode: 'off',
      videoDisabledDisplayMode: 'on',
      showArchiveStatus: false,
    },
  };

  const subscriberOptions = {
    camera: {
      height: '100%',
      width: '100%',
      inserMode: 'append',
      showControls: true,
      style: {
        audioLevelDisplayMode: 'auto',
        buttonDisplayMode: 'off',
        nameDisplayMode: 'off',
        videoDisabledDisplayMode: 'auto',
        showArchiveStatus: false,
      },
    },
    noVideo: {
      height: '100%',
      width: '100%',
      inserMode: 'append',
      showControls: true,
      style: {
        audioLevelDisplayMode: 'auto',
        buttonDisplayMode: 'off',
        nameDisplayMode: 'off',
        videoDisabledDisplayMode: 'auto',
        showArchiveStatus: false,
      },
    },
    screen: {
      height: '100%',
      width: '100%',
      inserMode: 'append',
      showControls: false,
      style: {
        audioLevelDisplayMode: 'off',
        buttonDisplayMode: 'off',
        nameDisplayMode: 'on',
        videoDisabledDisplayMode: 'off',
      },
    },
  };

  const SubscriberButtons = function (streamVideType) {
    const isScreenSharing = streamVideType === 'screen';

    const buttons = {
      video: {
        eventFiredName: 'roomView:buttonClick',
        dataIcon: isScreenSharing ? 'desktop' : 'video',
        eventName: 'click',
        context: 'otHelper',
        action: 'toggleSubscribersVideo',
        enabled: true,
      },
    };

    if (!isScreenSharing) {
      buttons.audio = {
        eventFiredName: 'roomView:buttonClick',
        dataIcon: 'audio',
        eventName: 'click',
        context: 'otHelper',
        action: 'toggleSubscribersAudio',
        enabled: true,
      };
    }

    return buttons;
  };

  const publisherButtons = {
    video: {
      eventFiredName: 'roomView:buttonClick',
      dataIcon: 'video',
      eventName: 'click',
      context: 'otHelper',
      action: 'togglePublisherVideo',
      enabled: true,
    },
    audio: {
      eventFiredName: 'roomView:buttonClick',
      dataIcon: 'mic',
      eventName: 'click',
      context: 'otHelper',
      action: 'togglePublisherAudio',
      enabled: true,
    },
  };

  let subscriberStreams = {
  };

  // We want to use media priorization on the subscriber streams. We're going to restrict the
  // maximum width and height to the one that's actually displayed. To do that, we're going to
  // observe changes on the elements that hold the subscribers.
  // Note that mutationObserver only works on IE11+, but that the previous alternative doesn't
  // work all that well either.
  const processMutation = function (aMutation) {
    const elem = aMutation.target;
    if ((aMutation.attributeName !== 'style' && aMutation.attributeName !== 'class') ||
        elem.data('streamType') !== 'camera') {
      return;
    }
    const streamId = elem.data('id');
    const subscriberPromise =
      subscriberStreams[streamId] && subscriberStreams[streamId].subscriberPromise;

    subscriberPromise.then((subscriber) => {
      if (debugPreferredResolution) {
        // If the user requested debugging this, we're going to export all the information through
        // window so he can examine the values.
        window.subscriberElem = window.subscriberElem || {};
        window.subscriberElem[streamId] = elem;
        window.subscriber = window.subscriber || {};
        window.subscriber[streamId] = subscriber;
        window.dumpResolutionInfo = window.dumpResolutionInfo || function () {
          Object.keys(window.subscriber)
            .forEach((aSub) => {
              const sub = window.subscriber[aSub];
              const stream = sub && sub.stream;
              const vd = stream && stream.videoDimensions;
              const streamPref = (stream && stream.getPreferredResolution()) ||
                                 { width: 'NA', height: 'NA' };
              stream && console.log( // eslint-disable-line no-console
                'StreamId:', aSub, 'Real:', sub.videoWidth(), 'x', sub.videoHeight(),
                'Stream.getPreferredResolution:', streamPref.width, 'x', streamPref.height,
                'Stream.VDimension:', vd.width, 'x', vd.height,
              );
            });
        };
      }

      const parent = elem.parentNode;

      const parentDimension = {
        width: parent.clientWidth,
        height: parent.clientHeight,
      };
      const subsDimension = {
        width: elem.clientWidth,
        height: elem.clientHeight,
      };
      otHelper.setPreferredResolution(subscriber, parentDimension, subsDimension, numUsrsInRoom - 1,
                                      resolutionAlgorithm);
    });
  };
  const _mutationObserver = exports.MutationObserver &&
    new exports.MutationObserver((aMutations) => {
      aMutations.forEach(processMutation);
    });

  const sendVideoEvent = function (stream) {
    if (!stream) {
      return;
    }

    Utils.sendEvent(`roomController:${stream.hasVideo ? 'videoEnabled' : 'videoDisabled'}`, {
      id: stream.streamId,
    });
  };

  const sendArchivingOperation = function (operation) {
    const data = {
      userName,
      roomName,
      operation,
    };

    Request.sendArchivingOperation(data)
      .then((response) => {
        debug.log(response);
      });
  };

  const roomStatusHandlers = {
    updatedRemotely(evt) {
      publisherReady.then(() => {
        _sharedStatus = RoomStatus.get(STATUS_KEY);
        const roomMuted = _sharedStatus.roomMuted;
        setAudioStatus(roomMuted);
        roomMuted && Utils.sendEvent('roomController:roomMuted', { isJoining: true });
      });
    },
  };

  const changeSubscriberStatus = function (name, status) {
    _disabledAllVideos = status;

    Object.keys(subscriberStreams).forEach((aStreamId) => {
      if (subscriberStreams[aStreamId] &&
          subscriberStreams[aStreamId].stream.videoType === 'camera') {
        pushSubscriberButton(aStreamId, name, status);
      }
    });
  };

  var pushSubscriberButton = function (streamId, name, status) {
    viewEventHandlers.buttonClick({
      detail: {
        streamId,
        name,
        disableAll: true,
        status,
      },
    });
  };

  function sendSignalMuteAll(status, onlyChangeSwitch) {
    otHelper.sendSignal('muteAll', { status, onlyChangeSwitch });
  }

  var viewEventHandlers = {
    endCall() {
      otHelper.disconnect();
    },
    startArchiving(evt) {
      sendArchivingOperation((evt.detail && evt.detail.operation) || 'startComposite');
    },
    stopArchiving(evt) {
      sendArchivingOperation('stop');
    },
    streamVisibilityChange(evt) {
      const getStatus = function (info) {
        let status = null;

        if (evt.detail.value === 'hidden') {
          info.prevEnabled = 'prevEnabled' in info ? info.prevEnabled : info.enabled;
          status = false;
        } else {
          status = 'prevEnabled' in info ? info.prevEnabled : info.enabled;
          delete info.prevEnabled;
        }

        return status;
      };

      const streamId = evt.detail.id;
      if (streamId !== 'publisher') {
        const stream = subscriberStreams[streamId];
        stream && otHelper.toggleSubscribersVideo(stream.stream,
                     getStatus(stream.buttons.video));
      }
    },
    buttonClick(evt) {
      const streamId = evt.detail.streamId;
      const streamType = evt.detail.streamType;
      const name = evt.detail.name;
      const disableAll = !!evt.detail.disableAll;
      const switchStatus = evt.detail.status;
      let buttonInfo = null;
      const args = [];
      let newStatus;
      const isPublisher = streamId === 'publisher';

      if (isPublisher) {
        buttonInfo = publisherButtons[name];
        newStatus = !buttonInfo.enabled;
        // There are a couple of possible race conditions that would end on us not changing
        // the status on the publisher (because it's already on that state) but where we should
        // update the UI to reflect the correct state.
        if (!otHelper.isPublisherReady || otHelper.publisherHas(name) === newStatus) {
          sendStatus({ stream: { streamId: 'publisher' } }, name, newStatus);
        }
      } else {
        const stream = subscriberStreams[streamId];
        if (!stream) {
          debug.error('Got an event from an nonexistent stream');
          return;
        }
        buttonInfo = stream.buttons[name];
        args.push(stream.stream);
        newStatus = !buttonInfo.enabled;
        // BUG xxxx - We don't receive videoDisabled/videoEnabled events when
        // stopping/starting the screen sharing video
        // OPENTOK-26021 - We don't receive any event when mute/unmute the audio in local streams
        if (streamType === 'screen' || name === 'audio') {
          // so we assume the operation was performed properly and change the UI status
          sendStatus({ stream: stream.stream }, name, newStatus);
        }
      }

      if (!buttonInfo) {
        debug.error('Got an event from an unknown button!');
        return;
      }

      args.push(newStatus);

      if (!disableAll || (disableAll && (switchStatus !== newStatus))) {
        const obj = exports[buttonInfo.context];
        obj[buttonInfo.action](...args);
        // if stream button clicked and isn't a screen
        if (!disableAll && streamType !== 'screen') {
          // If type = 'audio'
          //   it only has to propagate the change when the button clicked is the microphone
          // if type = 'video'
          //   only when button clicked is not the publisher's one (is a subscriber's video button)
          // it type = 'screen'
          //   don't do anything
          const isMicrophone = name === 'audio' && isPublisher;
          const isSubscribeToVideo = name === 'video' && !isPublisher;
          if (isMicrophone || isSubscribeToVideo) {
            Utils.sendEvent('roomController:userChangeStatus', { status: newStatus, name });
            if (isMicrophone) {
              sendSignalMuteAll(false, true);
              _sharedStatus.roomMuted = false;
            }
          }
        }
      }
    },
    videoSwitch(evt) {
      changeSubscriberStatus('video', evt.detail.status);
    },
    muteAllSwitch(evt) {
      const roomMuted = evt.detail.status;
      _sharedStatus.roomMuted = roomMuted;
      setAudioStatus(roomMuted);
      sendSignalMuteAll(roomMuted, false);
    },
  };

  var setAudioStatus = function (switchStatus) {
    otHelper.isPublisherReady && viewEventHandlers.buttonClick({
      detail: {
        streamId: 'publisher',
        name: 'audio',
        disableAll: true,
        status: switchStatus,
      },
    });
  };

  var sendStatus = function (evt, control, enabled) {
    let stream = evt.stream || evt.target.stream;
    if (!stream) {
      return;
    }

    const id = stream.streamId;
    stream = subscriberStreams[id];
    const buttonInfo = !stream ? publisherButtons[control] : stream.buttons[control];
    buttonInfo.enabled = !!enabled;

    Utils.sendEvent(`roomController:${control}`, {
      id,
      reason: evt.reason,
      enabled: buttonInfo.enabled,
    });
  };

  const _subscriberHandlers = {
    videoDisabled(evt) {
      evt.reason === 'subscribeToVideo' && sendStatus(evt, 'video');
      sendVideoEvent(evt.target.stream);
    },
    videoEnabled(evt) {
      evt.reason === 'subscribeToVideo' && sendStatus(evt, 'video', true);
      sendVideoEvent(evt.target.stream);
    },
    disconnected(evt) {
      Utils.sendEvent('roomController:disconnected', {
        id: evt.target.stream.streamId,
      });
    },
    connected(evt) {
      Utils.sendEvent('roomController:connected', {
        id: evt.target.stream.streamId,
      });
    },
  };

  let _allHandlers = {
    connectionCreated(evt) {
      RoomView.participantsNumber = ++numUsrsInRoom;
      debug.log('New participant, total:', numUsrsInRoom,
                'user:', (evt.connection.data ?
                          JSON.parse(evt.connection.data).userName : 'unknown'));
    },
    connectionDestroyed(evt) {
      RoomView.participantsNumber = --numUsrsInRoom;
      debug.log('a participant left, total:', numUsrsInRoom,
                'user:', (evt.connection.data ?
                          JSON.parse(evt.connection.data).userName : 'unknown'));
    },
    sessionDisconnected(evt) {
      // The client has disconnected from the session.
      // This event may be dispatched asynchronously in response to a successful
      // call to the disconnect() method of the Session object.
      // The event may also be disptached if a session connection is lost
      // inadvertantly, as in the case of a lost network connection.
      numUsrsInRoom = 0;
      Utils.sendEvent('roomController:sessionDisconnected');
      subscriberStreams = {};
    },
    streamCreated(evt) {
      publisherReady.then(() => {
        // A new stream, published by another client, has been created on this
        // session. For streams published by your own client, the Publisher object
        // dispatches a streamCreated event. For a code example and more details,
        // see StreamEvent.
        const stream = evt.stream;
        const streamVideoType = stream.videoType || 'noVideo';

        const streamId = stream.streamId;
        subscriberStreams[streamId] = {
          stream,
          buttons: new SubscriberButtons(streamVideoType),
        };

        const subOptions = subscriberOptions[streamVideoType];
        const enterWithVideoDisabled = streamVideoType === 'camera' && _disabledAllVideos;

        _sharedStatus = RoomStatus.get(STATUS_KEY);

        const subsDOMElem = RoomView.createStreamView(streamId, {
          name: stream.name,
          type: stream.videoType,
          controlElems: subscriberStreams[streamId].buttons,
        });

        if (streamVideoType === 'noVideo') {
          RoomView.deleteVideoButton(streamId);
        }

        subOptions.subscribeToVideo = !enterWithVideoDisabled;

        // We want to observe the container where the actual suscriber will live
        const subsContainer = LayoutManager.getItemById(streamId);
        subsContainer && _mutationObserver &&
          _mutationObserver.observe(subsContainer, { attributes: true });
        subscriberStreams[streamId].subscriberPromise =
          otHelper.subscribe(evt.stream, subsDOMElem, subOptions, {}, enableAnnotations)
          .then((subscriber) => {
            if (streamVideoType === 'screen') {
              enableAnnotations && Utils.sendEvent('roomController:annotationStarted');
              return subscriber;
            }

            Object.keys(_subscriberHandlers).forEach((name) => {
              subscriber.on(name, _subscriberHandlers[name]);
            });
            if (enterWithVideoDisabled) {
              pushSubscriberButton(streamId, 'video', true);
            }
            sendVideoEvent(evt.stream);
            return subscriber;
          }, (error) => {
            debug.error(`Error susbscribing new participant. ${error.message}`);
          });
      });
    },
    streamDestroyed(evt) {
      // A stream from another client has stopped publishing to the session.
      // The default behavior is that all Subscriber objects that are subscribed
      // to the stream are unsubscribed and removed from the HTML DOM. Each
      // Subscriber object dispatches a destroyed event when the element is
      // removed from the HTML DOM. If you call the preventDefault() method in
      // the event listener for the streamDestroyed event, the default behavior
      // is prevented and you can clean up Subscriber objects using your own
      // code. See Session.getSubscribersForStream().
      // For streams published by your own client, the Publisher object
      // dispatches a streamDestroyed event.
      // For a code example and more details, see StreamEvent.
      const stream = evt.stream;
      if (stream.videoType === 'screen') {
        Utils.sendEvent('roomController:annotationEnded');
      }
      RoomView.deleteStreamView(stream.streamId);
      subscriberStreams[stream.streamId] = null;
    },
    streamPropertyChanged(evt) {
      if (otHelper.publisherId !== evt.stream.id) {
        return;
      }
      if (evt.changedProperty === 'hasVideo') {
        evt.reason = 'publishVideo';
        sendStatus(evt, 'video', evt.newValue);
      } else if (evt.changedProperty === 'hasAudio') {
        evt.reason = 'publishAudio';
        sendStatus(evt, 'audio', evt.newValue);
      }
    },
    archiveStarted(evt) {
      // Dispatched when an archive recording of the session starts
      Utils.sendEvent('archiving', {
        status: 'started',
        id: evt.id,
      });
    },
    archiveStopped(evt) {
      // Dispatched when an archive recording of the session stops
      Utils.sendEvent('archiving', { status: 'stopped' });
    },
    'signal:muteAll': function (evt) {
      const statusData = JSON.parse(evt.data);
      const muteAllSwitch = statusData.status;
      const onlyChangeSwitch = statusData.onlyChangeSwitch;

      const setNewAudioStatus = function (isMuted, onlySwitch) {
        if (_sharedStatus.roomMuted !== isMuted) {
          return;
        }
        !onlySwitch && setAudioStatus(isMuted);
        RoomView.setAudioSwitchRemotely(isMuted);
      }.bind(undefined, muteAllSwitch, onlyChangeSwitch);

      if (!otHelper.isMyself(evt.from)) {
        _sharedStatus.roomMuted = muteAllSwitch;
        if (muteAllSwitch) {
          setAudioStatus(muteAllSwitch);
          Utils.sendEvent('roomController:roomMuted', { isJoining: false });
        } else if (onlyChangeSwitch) {
          setNewAudioStatus();
        } else {
          RoomView.showConfirmChangeMicStatus(muteAllSwitch).then(setNewAudioStatus);
        }
      }
    },
  };

  function showUserNamePrompt(roomName) {
    const selector = '.user-name-modal';
    function loadModalText() {
      document.querySelector(`${selector} header .room-name`).textContent = roomName;
    }
    return Modal.show(selector, loadModalText).then(() => new Promise((resolve, reject) => {
      const enterButton = document.querySelector(`${selector} button`);
      enterButton.addEventListener('click', function onClicked(event) {
        event.preventDefault();
        enterButton.removeEventListener('click', onClicked);
        return Modal.hide(selector)
            .then(() => {
              resolve(document.querySelector(`${selector} input`).value.trim());
            });
      });
      document.querySelector(`${selector} input.username`).focus();
    }));
  }

  function getReferrerURL() {
    let referrerURL = '';

    try {
      referrerURL = new URL(document.referrer);
    } catch (ex) { // eslint no-empty: ["error":{ "allowEmptyCatch": true }]

    }

    return referrerURL;
  }

  function getRoomParams() {
    if (!exports.RoomController) {
      throw new Error('Room Controller is not defined. Missing script tag?');
    }

    // pathName should be /room/<roomName>[?username=<userName>]
    debug.log(document.location.pathname);
    debug.log(document.location.search);
    const pathName = document.location.pathname.split('/');

    if (!pathName || pathName.length < 2) {
      debug.log('This should not be happen, it\'s not possible to do a ' +
                'request without /room/<roomName>[?username=<usr>]');
      throw new Error('Invalid path');
    }

    let roomName = '';
    const length = pathName.length;
    if (length > 0) {
      roomName = pathName[length - 1];
    }
    roomName = Utils.decodeStr(roomName);

    // Recover user identifier
    const params = Utils.parseSearch(document.location.search);
    const usrId = params.getFirstValue('userName');
    resolutionAlgorithm = params.getFirstValue('resolutionAlgorithm');
    debugPreferredResolution = params.getFirstValue('debugPreferredResolution');
    enableHangoutScroll = params.getFirstValue('enableHangoutScroll') !== undefined;

    const info = {
      username: usrId,
      roomName,
    };

    if (usrId || (window.location.origin === getReferrerURL().origin)) {
      return Promise.resolve(info);
    }
    return showUserNamePrompt(roomName).then((userName) => {
      info.username = userName;
      return info;
    });
  }

  function getRoomInfo(aRoomParams) {
    return Request
      .getRoomInfo(aRoomParams)
      .then((aRoomInfo) => {
        if (!(aRoomInfo && aRoomInfo.token && aRoomInfo.sessionId &&
              aRoomInfo.apiKey && aRoomInfo.username &&
              aRoomInfo.firebaseToken && aRoomInfo.firebaseURL)) {
          debug.error('Error getRoomParams [', aRoomInfo,
                      '] without correct response');
          throw new Error('Error getting room parameters');
        }
        aRoomInfo.roomName = aRoomParams.roomName;
        enableAnnotations = aRoomInfo.enableAnnotation;
        enableArchiveManager = aRoomInfo.enableArchiveManager;
        return aRoomInfo;
      });
  }

  const modules = [
    '/js/components/htmlElems.js',
    '/js/helpers/resolutionAlgorithms.js',
    '/js/helpers/OTHelper.js',
    '/js/itemsHandler.js',
    '/js/layoutView.js',
    '/js/layouts.js',
    '/js/layoutManager.js',
    '/js/roomView.js',
    '/js/roomStatus.js',
    '/js/chatController.js',
    '/js/recordingsController.js',
    '/js/endCallController.js',
    '/js/layoutMenuController.js',
    '/js/screenShareController.js',
    '/js/feedbackController.js',
  ];

  const init = function () {
    LazyLoader.load(modules)
    .then(() => {
      EndCallController.init({ addEventListener() {} }, 'NOT_AVAILABLE');
    })
    .then(getRoomParams)
    .then(aParams => Promise.resolve(aParams))
    .then(getRoomInfo)
    .then((aParams) => {
      let loadAnnotations = Promise.resolve();
      if (enableAnnotations) {
        exports.OTKAnalytics = exports.OTKAnalytics ||
          function () {
            return {
              addSessionInfo() {},
              logEvent(a, b) {
                console.log(a, b); // eslint-disable-line no-console
              },
            };
          };
        loadAnnotations = LazyLoader.load([
          'https://code.jquery.com/jquery-3.1.0.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js',
          '/js/vendor/opentok-annotation.js',
        ]);
      }
      return loadAnnotations.then(() => aParams);
    })
  .then((aParams) => {
    Utils.addEventsHandlers('roomView:', viewEventHandlers, exports);
    Utils.addEventsHandlers('roomStatus:', roomStatusHandlers, exports);
    RoomView.init(enableHangoutScroll, enableArchiveManager);

    roomName = aParams.roomName;
    userName = aParams.username ? aParams.username.substring(0, 1000) : '';

    // This kinda sucks, but it's the easiest way to leave the 'context' thing work as it does now
    otHelper = new exports.OTHelper(aParams);
    exports.otHelper = otHelper;

    const publish = otHelper.publish.bind(otHelper);

      // Room's name is set by server, we don't need to do this, but
      // perphaps it would be convenient
      // RoomView.roomName = aParams.roomName;
    RoomView.participantsNumber = 0;

    _allHandlers = RoomStatus.init(_allHandlers, { room: _sharedStatus });

    ChatController
        .init(aParams.roomName, userName, _allHandlers)
        .then(LayoutMenuController.init)
        .then(() => {
          const publisherElement = RoomView.createStreamView('publisher', {
            name: userName,
            type: 'publisher',
            controlElems: publisherButtons,
          });
          // If we have all audios disabled, we need to set the button status
          // and don't publish audio
          if (_sharedStatus.roomMuted) {
            // Set visual status of button
            sendStatus({
              stream: {
                streamId: 'Publisher',
              },
              reason: 'publishAudio',
            }, 'audio', false);
            // Don't publish audio
            publisherOptions.publishAudio = false;
          }
          publisherOptions.name = userName;
          return new Promise((resolve, reject) => {
            otHelper.initPublisher(publisherElement, publisherOptions, {}).then(() => {
              setPublisherReady();
              resolve();
            }).catch((errInfo) => {
              if (errInfo.error.name === 'OT_CHROME_MICROPHONE_ACQUISITION_ERROR') {
                Utils.sendEvent('roomController:chromePublisherError');
              }
              RoomView.deleteStreamView('publisher');
              reject();
            });
          });
        })
        .then(() => new Promise((resolve) => {
          ChatController.setHelper(otHelper);
          otHelper.connect(_allHandlers).then(() => {
            resolve();
          });
        }))
        .then(publish)
        .then((publisher) => {
          if (!publisher.stream.videoType) {
            RoomView.deleteVideoButton('publisher');
          }
          RecordingsController.init(enableArchiveManager, aParams.firebaseURL,
                                    aParams.firebaseToken, aParams.sessionId);
          ScreenShareController.init(userName, aParams.chromeExtId, otHelper, enableAnnotations);
          FeedbackController.init(otHelper);
          Utils.sendEvent('roomController:controllersReady');
        })
        .catch((error) => {
          debug.error(`Error Connecting to room. ${error.message}`);
        });
  });
  };

  const RoomController = {
    init,
  };

  exports.RoomController = RoomController;
}(this));
