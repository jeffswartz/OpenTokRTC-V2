!(function (exports) {
  'use strict';

  var realEJSTemplate = null;

  var _MockEJSTemplate = function (aTemplateOptions) {
    if (aTemplateOptions.url) {
      this._templatePromise =
        Request.sendXHR('GET', aTemplateOptions.url, null, null, 'text')
          .then(function (aTemplateSrc) {
            return ejs.compile(aTemplateSrc, { filename: aTemplateOptions.url });
          });
    } else {
      this._templatePromise = Promise.resolve(ejs.compile(aTemplateOptions.text));
    }
    this.render = function (aData) {
      return this._templatePromise.then(function (aTemplate) {
        return aTemplate(aData);
      });
    },
    this._install = function () {
      realEJSTemplate = EJSTemplate;
      EJSTemplate = MockEJSTemplate;
    },
    this._restore = function () {
      EJSTemplate = realEJSTemplate;
    },

  function EJSTemplate() {
    return _EJSTemplate;
  }

  exports.MockEJSTemplate = MockEJSTemplate;
  Object.keys(_MockEJSTemplate).forEach((attr) => {
    exports.MockEJSTemplate[attr] = _MockEJSTemplate[attr];
  });
}(this));
