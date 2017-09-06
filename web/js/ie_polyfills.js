/* eslint-disable no-extend-native */
/* eslint-disable no-bitwise */

// This file adds what we've detected that's missing in IE and we've used inadvertently. We've
// tried to be as vanilla as possible (except for promises) but sometimes surprising things fall
// between the cracks
!(function (global) {
  // String doesn't have startsWith
  if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (substr) {
      return this.indexOf(substr) === 0;
    };
  }

  if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (searchString, position) {
      const subjectString = this.toString();
      if (typeof position !== 'number' || !isFinite(position) ||
            Math.floor(position) !== position || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      const lastIndex = subjectString.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
    };
  }

  // window.location.origin doesn't exist in IE...
  if (global && global.location && !global.location.origin) {
    // So we just create it:
    const loc = global.location;
    const protocol = loc.protocol;
    let port = loc.port;
    if (!port) {
      port = protocol === 'https' ? 443 : 80;
    }
    global.location.origin = `${protocol}//${loc.host}:${port}`;
  }

  // And IE uses a curious way to init custom events... and to make things more
  // interesting, CustomEvent exists also, only it's not a constructor.
  // Note that this is total and completely *unsafe* to do if you're using
  // external libraries that depend on CustomEvent in IE being what it is!
  if (typeof global.CustomEvent !== 'function') {
    global._ieCustomEvent = global.CustomEvent;
    global.CustomEvent = function (eventName, initDict) {
      const evt = document.createEvent('CustomEvent');
      const detail = (initDict && initDict.detail) || undefined;
      evt.initCustomEvent(eventName, true, true, detail);
      return evt;
    };
  }

  if (typeof global.URL !== 'function') {
    global._ieURL = global.URL;
    global.URL = function (str) {
      const parser = document.createElement('a');
      parser.href = str;
      if (!parser.hostname) {
        throw new Error('URL is not valid');
      }
      this.origin = `${parser.protocol}//${parser.host}`;
      const port = parser.protocol === 'https' ? 443 : 80;
      if (this.origin.endsWith(`:${port}`)) {
        this.origin = this.origin.replace(`:${port}`, '');
      }
    };
    global.URL.createObjectURL = global._ieURL.createObjectURL;
    global.URL.revokeObjectURL = global._ieURL.revokeObjectURL;
  }

  if (!Array.prototype.find) {
    Array.prototype.find = function (predicate) {
      if (this === null) {
        throw new TypeError('Array.prototype.find called on null or undefined');
      }
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }
      const list = Object(this);
      const length = list.length >>> 0;
      const thisArg = arguments[1];
      let value;

      for (let i = 0; i < length; i++) {
        value = list[i];
        if (predicate.call(thisArg, value, i, list)) {
          return value;
        }
      }
      return undefined;
    };
  }

  if (!global.Intl) {
    global.Intl = {
      DateTimeFormat(locales, options) {
        return {
          format(date) {
            const time = [];
            let suffix = '';

            let hours = date.getHours();
            if (options.hour12) {
              if (hours > 12) {
                suffix = ' PM';
                hours -= 12;
              } else {
                suffix = ' AM';
              }
            }

            if (options.hour === '2-digit' && hours < 10) {
              time.push('0');
            }

            time.push(hours);
            time.push(':');

            const minutes = date.getMinutes();
            if (options.minute === '2-digit' && minutes < 10) {
              time.push('0');
            }

            time.push(minutes);
            time.push(suffix);

            return time.join('');
          },
        };
      },
    };
  }

  if (typeof WeakMap === 'undefined') {
    (function () {
      const defineProperty = Object.defineProperty;
      let counter = Date.now() % 1e9;

      const WeakMap = function () {
        this.name = `__st${Math.random() * 1e9 >>> 0}${counter++}__`;
      };

      WeakMap.prototype = {
        set(key, value) {
          const entry = key[this.name];
          if (entry && entry[0] === key) {
            entry[1] = value;
          } else {
            defineProperty(key, this.name, { value: [key, value], writable: true });
          }
          return this;
        },
        get(key) {
          const entry = key[this.name];
          if (entry && entry[0] === key) {
            return entry[1];
          }
          return undefined;
        },
        delete(key) {
          const entry = key[this.name];
          if (!entry) return false;
          const hasValue = entry[0] === key;
          entry[0] = entry[1] = undefined;
          return hasValue;
        },
        has(key) {
          const entry = key[this.name];
          if (!entry) return false;
          return entry[0] === key;
        },
      };

      window.WeakMap = WeakMap;
    }());
  }
}(this));
