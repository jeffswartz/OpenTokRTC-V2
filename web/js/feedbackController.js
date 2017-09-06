!(function (global) {
  const debug =
    new Utils.MultiLevelLogger('feedbackController.js', Utils.MultiLevelLogger.DEFAULT_LEVELS.all);
  let otHelper;

  const eventHandlers = {
    sendFeedback(evt) {
      const report = evt.detail;
      const loggedEvent = {
        action: 'SessionQuality',
        partnerId: otHelper.session.apiKey,
        sessionId: otHelper.session.id,
        connectionId: otHelper.session.connection.id,
        publisherId: otHelper.publisherId,
        audioScore: report.audioScore,
        videoScore: report.videoScore,
        description: report.description,
      };
      debug.log('feedbackView:sendFeedback', loggedEvent);
      OT.analytics.logEvent(loggedEvent);
    },
    reportIssue() {
      const loggedEvent = {
        action: 'ReportIssue',
        partnerId: otHelper.session.apiKey,
        sessionId: otHelper.session.id,
        connectionId: otHelper.session.connection.id,
        publisherId: otHelper.publisherId,
      };
      OT.reportIssue((error, reportId) => {
        if (error) {
          debug.error('feedbackView:reportIssue', loggedEvent);
        } else {
          loggedEvent.reportIssueId = reportId;
          debug.log('feedbackView:reportIssue', loggedEvent);
        }
      });
    },
  };

  const init = function (aOTHelper) {
    return LazyLoader.load([
      '/js/feedbackView.js',
    ]).then(() => {
      otHelper = aOTHelper;
      Utils.addEventsHandlers('feedbackView:', eventHandlers, global);
      FeedbackView.init();
    });
  };

  global.FeedbackController = {
    init,
  };
}(this));
