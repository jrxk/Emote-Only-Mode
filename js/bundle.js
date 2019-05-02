(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Bundle = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const { EmoteFetcher } = require('twitch-emoticons');

module.exports = {EmoteFetcher: EmoteFetcher}
},{"twitch-emoticons":5}],2:[function(require,module,exports){
module.exports = require('./src');

},{"./src":4}],3:[function(require,module,exports){
function buildRequest(method, url) {
  return {
    method,
    path: url,
    redirect: this.options.followRedirects ? 'follow' : 'manual',
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    getHeader(name) {
      return this.headers[name.toLowerCase()];
    },
  };
}

function finalizeRequest() {
  this._finalizeRequest();
  if (this.data)
    this.request.body = this.data;
  return window.fetch(this.request.path, this.request)
    .then((r) => r.text().then((t) => {
      const headers = {};
      for (const [k, v] of r.headers.entries())
        headers[k.toLowerCase()] = v;
      return { response: r, raw: t, headers };
    }));
}

module.exports = {
  buildRequest, finalizeRequest,
  shouldSendRaw: () => false,
  METHODS: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'PATCH'],
  STATUS_CODES: {},
  Extension: Object,
  FormData: window.FormData,
};

},{}],4:[function(require,module,exports){
const browser = typeof window !== 'undefined';
const querystring = require('querystring');
const transport = browser ? require('./browser') : require('./node');

/**
 * Snekfetch
 * @extends Stream.Readable
 * @extends Promise
 */
class Snekfetch extends transport.Extension {
  /**
   * Options to pass to the Snekfetch constructor
   * @typedef {object} SnekfetchOptions
   * @memberof Snekfetch
   * @property {object} [headers] Headers to initialize the request with
   * @property {object|string|Buffer} [data] Data to initialize the request with
   * @property {string|Object} [query] Query to intialize the request with
   * @property {boolean} [followRedirects=true] If the request should follow redirects
   * @property {object} [qs=querystring] Querystring module to use, any object providing
   * `stringify` and `parse` for querystrings
   * @property {number} [version = 1] The http version to use [1 or 2]
   * @property {external:Agent} [agent] Whether to use an http agent
   */

  /**
   * Create a request.
   * Usually you'll want to do `Snekfetch#method(url [, options])` instead of
   * `new Snekfetch(method, url [, options])`
   * @param {string} method HTTP method
   * @param {string} url URL
   * @param {SnekfetchOptions} [opts] Options
   */
  constructor(method, url, opts = {}) {
    super();
    this.options = Object.assign({ version: 1, qs: querystring, followRedirects: true }, opts);
    this.request = transport.buildRequest.call(this, method, url, opts);
    if (opts.headers)
      this.set(opts.headers);
    if (opts.query)
      this.query(opts.query);
    if (opts.data)
      this.send(opts.data);
  }

  /**
   * Add a query param to the request
   * @param {string|Object} name Name of query param or object to add to query
   * @param {string} [value] If name is a string value, this will be the value of the query param
   * @returns {Snekfetch} This request
   */
  query(name, value) {
    if (!this.request.query)
      this.request.query = {};
    if (name !== null && typeof name === 'object') {
      for (const [k, v] of Object.entries(name))
        this.query(k, v);
    } else {
      this.request.query[name] = value;
    }

    return this;
  }

  /**
   * Add a header to the request
   * @param {string|Object} name Name of query param or object to add to headers
   * @param {string} [value] If name is a string value, this will be the value of the header
   * @returns {Snekfetch} This request
   */
  set(name, value) {
    if (name !== null && typeof name === 'object') {
      for (const key of Object.keys(name))
        this.set(key, name[key]);
    } else {
      this.request.setHeader(name, value);
    }

    return this;
  }

  /**
   * Attach a form data object
   * @param {string} name Name of the form attachment
   * @param {string|Object|Buffer} data Data for the attachment
   * @param {string} [filename] Optional filename if form attachment name needs to be overridden
   * @returns {Snekfetch} This request
   */
  attach(...args) {
    const form = this.data instanceof transport.FormData ? this.data : this.data = new transport.FormData();
    if (typeof args[0] === 'object') {
      for (const [k, v] of Object.entries(args[0]))
        this.attach(k, v);
    } else {
      form.append(...args);
    }

    return this;
  }

  /**
   * Send data with the request
   * @param {string|Buffer|Object} data Data to send
   * @returns {Snekfetch} This request
   */
  send(data) {
    if (data instanceof transport.FormData || transport.shouldSendRaw(data)) {
      this.data = data;
    } else if (data !== null && typeof data === 'object') {
      const header = this.request.getHeader('content-type');
      let serialize;
      if (header) {
        if (header.includes('json'))
          serialize = JSON.stringify;
        else if (header.includes('urlencoded'))
          serialize = this.options.qs.stringify;
      } else {
        this.set('Content-Type', 'application/json');
        serialize = JSON.stringify;
      }
      this.data = serialize(data);
    } else {
      this.data = data;
    }
    return this;
  }

  then(resolver, rejector) {
    if (this._response)
      return this._response.then(resolver, rejector);
    // eslint-disable-next-line no-return-assign
    return this._response = transport.finalizeRequest.call(this)
      .then(({ response, raw, redirect, headers }) => {
        if (redirect) {
          let method = this.request.method;
          if ([301, 302].includes(response.statusCode)) {
            if (method !== 'HEAD')
              method = 'GET';
            this.data = null;
          } else if (response.statusCode === 303) {
            method = 'GET';
          }

          const redirectHeaders = this.request.getHeaders();
          delete redirectHeaders.host;
          return new Snekfetch(method, redirect, {
            data: this.data,
            headers: redirectHeaders,
            version: this.options.version,
          });
        }

        const statusCode = response.statusCode || response.status;
        // forgive me :(
        const self = this; // eslint-disable-line consistent-this
        /**
         * Response from Snekfetch
         * @typedef {Object} SnekfetchResponse
         * @memberof Snekfetch
         * @prop {HTTP.Request} request
         * @prop {?string|object|Buffer} body Processed response body
         * @prop {string} text Raw response body
         * @prop {boolean} ok If the response code is >= 200 and < 300
         * @prop {number} status HTTP status code
         * @prop {string} statusText Human readable HTTP status
         */
        const res = {
          request: this.request,
          get body() {
            delete res.body;
            const type = this.headers['content-type'];
            if (type && type.includes('application/json')) {
              try {
                res.body = JSON.parse(res.text);
              } catch (err) {
                res.body = res.text;
              }
            } else if (type && type.includes('application/x-www-form-urlencoded')) {
              res.body = self.options.qs.parse(res.text);
            } else {
              res.body = raw;
            }

            return res.body;
          },
          text: raw.toString(),
          ok: statusCode >= 200 && statusCode < 400,
          headers: headers || response.headers,
          status: statusCode,
          statusText: response.statusText || transport.STATUS_CODES[response.statusCode],
        };

        if (res.ok) {
          return res;
        } else {
          const err = new Error(`${res.status} ${res.statusText}`.trim());
          Object.assign(err, res);
          return Promise.reject(err);
        }
      })
      .then(resolver, rejector);
  }

  catch(rejector) {
    return this.then(null, rejector);
  }

  /**
   * End the request
   * @param {Function} [cb] Optional callback to handle the response
   * @returns {Promise} This request
   */
  end(cb) {
    return this.then(
      (res) => cb ? cb(null, res) : res,
      (err) => cb ? cb(err, err.status ? err : null) : Promise.reject(err)
    );
  }

  _finalizeRequest() {
    if (!this.request)
      return;

    if (this.request.method !== 'HEAD')
      this.set('Accept-Encoding', 'gzip, deflate');
    if (this.data && this.data.getBoundary)
      this.set('Content-Type', `multipart/form-data; boundary=${this.data.getBoundary()}`);

    if (this.request.query) {
      const [path, query] = this.request.path.split('?');
      this.request.path = `${path}?${this.options.qs.stringify(this.request.query)}${query ? `&${query}` : ''}`;
    }
  }
}

/**
 * Create a ((THIS)) request
 * @dynamic this.METHODS
 * @method Snekfetch.((THIS)lowerCase)
 * @param {string} url The url to request
 * @param {Snekfetch.snekfetchOptions} [opts] Options
 * @returns {Snekfetch}
 */
Snekfetch.METHODS = transport.METHODS.concat('BREW').filter((m) => m !== 'M-SEARCH');
for (const method of Snekfetch.METHODS) {
  Snekfetch[method.toLowerCase()] = function runMethod(url, opts) {
    const Constructor = this.prototype instanceof Snekfetch ? this : Snekfetch;
    return new Constructor(method, url, opts);
  };
}

module.exports = Snekfetch;

/**
 * @external Agent
 * @see {@link https://nodejs.org/api/http.html#http_class_http_agent}
 */

},{"./browser":3,"./node":15,"querystring":18}],5:[function(require,module,exports){
module.exports = {
    BTTVEmote: require('./struct/BTTVEmote'),
    Channel: require('./struct/Channel'),
    Emote: require('./struct/Emote'),
    EmoteFetcher: require('./struct/EmoteFetcher'),
    EmoteParser: require('./struct/EmoteParser'),
    FFZEmote: require('./struct/FFZEmote'),
    TwitchEmote: require('./struct/TwitchEmote'),
    Collection: require('./util/Collection'),
    Constants: require('./util/Constants')
};

},{"./struct/BTTVEmote":6,"./struct/Channel":7,"./struct/Emote":8,"./struct/EmoteFetcher":9,"./struct/EmoteParser":10,"./struct/FFZEmote":11,"./struct/TwitchEmote":12,"./util/Collection":13,"./util/Constants":14}],6:[function(require,module,exports){
const Emote = require('./Emote');
const Constants = require('../util/Constants');

/** @extends Emote */
class BTTVEmote extends Emote {
    /**
     * A BTTV emote.
     * @param {Channel} channel - Channel this emote belongs to.
     * @param {string} id - ID of the emote.
     * @param {data} data - The raw emote data.
     */
    constructor(channel, id, data) {
        super(channel, id, data);
        this.type = 'bttv';
    }

    /**
     * The channel of this emote's creator.
     * Not guaranteed to contain the emote, or be cached.
     * @readonly
     * @type {?Channel}
     */
    get owner() {
        return this.fetcher.channels.get(this.ownerName);
    }

    _setup(data) {
        super._setup(data);

        /**
         * The name of the emote creator's channel.
         * Will be null for global emotes.
         * @type {?string}
         */
        this.ownerName = data.channel;

        /**
         * The image type of the emote.
         * @type {string}
         */
        this.imageType = data.imageType;
    }

    /**
     * Gets the image link of the emote.
     * @param {number} size - The size of the image, 0, 1, or 2.
     * @returns {string}
     */
    toLink(size = 0) {
        return Constants.BTTV.CDN(this.id, size); // eslint-disable-line new-cap
    }
}

module.exports = BTTVEmote;

},{"../util/Constants":14,"./Emote":8}],7:[function(require,module,exports){
const Collection = require('../util/Collection');

class Channel {
    /**
     * A Twitch channel.
     * @param {EmoteFetcher} fetcher - The emote fetcher.
     * @param {string} name - The name of the channel.
     */
    constructor(fetcher, name) {
        /**
         * The emote fetcher.
         * @type {EmoteFetcher}
         */
        this.fetcher = fetcher;

        /**
         * The name of this channel.
         * For the global channel, the name will be null.
         * @type {?string}
         */
        this.name = name;

        /**
         * Cached emotes belonging to this channel.
         * @type {Collection<string, Emote>}
         */
        this.emotes = new Collection();
    }

    /**
     * Fetches the BTTV emotes for this channel.
     * @returns {Promise<Collection<string, BTTVEmote>>}
     */
    fetchBTTVEmotes() {
        return this.fetcher.fetchBTTVEmotes(this.name);
    }

    /**
     * Fetches the FFZ emotes for this channel.
     * @returns {Promise<Collection<string, FFZEmote>>}
     */
    fetchFFZEmotes() {
        return this.fetcher.fetchFFZEmotes(this.name);
    }
}

module.exports = Channel;

},{"../util/Collection":13}],8:[function(require,module,exports){
class Emote {
    /**
     * Base class for emotes.
     * This constructor is not to be used.
     * @param {Channel} channel - Channel this emote belongs to.
     * @param {string} id - ID of the emote.
     * @param {data} data - The raw emote data.
     */
    constructor(channel, id, data) {
        if (new.target.name === Emote.name) {
            throw new Error('Base Emote class cannot be used');
        }

        /**
         * The emote fetcher.
         * @type {EmoteFetcher}
         */
        this.fetcher = channel.fetcher;

        /**
         * The channel this emote belongs to.
         * Only accurate and constant on Twitch emotes.
         * For other types of emotes, use the `owner` or `ownerName` property.
         * @type {Channel}
         */
        this.channel = channel;

        /**
         * The ID of this emote.
         * @type {string}
         */
        this.id = id;

        /**
         * The type of this emote.
         * Either `twitch`, `bttv`, or `ffz`.
         * @type {string}
         */
        this.type = null;
        this._setup(data);
    }

    _setup(data) {
        /**
         * The code or name of the emote.
         * @type {string}
         */
        this.code = data.code;
    }

    toLink() {
        return null;
    }

    /**
     * Override for `toString`.
     * Will give the emote's name.
     * @returns {string}
     */
    toString() {
        return this.code;
    }
}

module.exports = Emote;

},{}],9:[function(require,module,exports){
const BTTVEmote = require('./BTTVEmote');
const Channel = require('./Channel');
const Collection = require('../util/Collection');
const Constants = require('../util/Constants');
const FFZEmote = require('./FFZEmote');
const request = require('snekfetch');
const TwitchEmote = require('./TwitchEmote');

class EmoteFetcher {
    /**
     * Fetches and caches emotes.
     */
    constructor() {
        /**
         * Cached emotes.
         * Collectionped by emote code to Emote instance.
         * @type {Collection<string, Emote>}
         */
        this.emotes = new Collection();

        /**
         * Cached channels.
         * Collectionped by name to Channel instance.
         * @type {Collection<string, Channel>}
         */
        this.channels = new Collection();
    }

    /**
     * The global channel for both Twitch and BTTV.
     * @readonly
     * @type {?Channel}
     */
    get globalChannel() {
        return this.channels.get(null);
    }

    /**
     * Gets the raw twitch emotes data.
     * @private
     * @returns {Promise<Object>}
     */
    _getRawTwitchEmotes() {
        return request.get(Constants.Twitch.All).then(res => res.body);
    }

    /**
     * Converts and caches a raw twitch emote.
     * @private
     * @param {string} id - ID of the emote.
     * @param {Object} data - Raw data.
     * @returns {TwitchEmote}
     */
    _cacheTwitchEmote(id, data) {
        let channel = this.channels.get(data.channel);
        if (!channel) {
            channel = new Channel(this, data.channel);
            this.channels.set(data.channel, channel);
        }

        channel.title = data.channel_title;
        const emote = new TwitchEmote(channel, id, data);
        this.emotes.set(emote.code, emote);
        channel.emotes.set(emote.code, emote);
        return emote;
    }

    /**
     * Gets the raw BTTV emotes data for a channel.
     * @private
     * @param {string} name - Name of the channel.
     * @returns {Promise<Object[]>}
     */
    _getRawBTTVEmotes(name) {
        const endpoint = !name
        ? Constants.BTTV.Global
        : Constants.BTTV.Channel(name); // eslint-disable-line new-cap

        return request.get(endpoint).then(res => res.body.emotes);
    }

    /**
     * Converts and caches a raw BTTV emote.
     * @private
     * @param {string} name - Name of the channel.
     * @param {Object} data - Raw data.
     * @returns {BTTVEmote}
     */
    _cacheBTTVEmote(name, data) {
        let channel = this.channels.get(name);
        if (!channel) {
            channel = new Channel(this, name);
            this.channels.set(name, channel);
        }

        const emote = new BTTVEmote(channel, data.id, data);
        this.emotes.set(emote.code, emote);
        channel.emotes.set(emote.code, emote);
        return emote;
    }

    /**
     * Gets the raw FFZ emotes data for a channel.
     * @private
     * @param {string} name - Name of the channel.
     * @returns {Promise<Object[]>}
     */
    _getRawFFZEmotes(name) {
        return request.get(Constants.FFZ.Channel(name)).then(res => { // eslint-disable-line new-cap
            const emotes = [];
            for (const key of Object.keys(res.body.sets)) {
                const set = res.body.sets[key];
                emotes.push(...set.emoticons);
            }

            return emotes;
        });
    }

    /**
     * Converts and caches a raw FFZ emote.
     * @private
     * @param {string} name - Name of the channel.
     * @param {Object} data - Raw data.
     * @returns {FFZEmote}
     */
    _cacheFFZEmote(name, data) {
        let channel = this.channels.get(name);
        if (!channel) {
            channel = new Channel(this, name);
            this.channels.set(name, channel);
        }

        const emote = new FFZEmote(channel, data.id, data);
        this.emotes.set(emote.code, emote);
        channel.emotes.set(emote.code, emote);
        return emote;
    }

    /**
     * Fetches and caches all twitch emotes.
     * If channel names are specified, will only cache those channels.
     * Use `null` for the global emotes channel.
     * @param {string|string[]} [names] - Names of channels to cache.
     * @returns {Promise<Collection<string, TwitchEmote>>}
     */
    fetchTwitchEmotes(names) {
        if (names && !Array.isArray(names)) names = [names];
        return this._getRawTwitchEmotes().then(rawEmotes => {
            for (const key of Object.keys(rawEmotes)) {
                const data = rawEmotes[key];
                if (names === undefined || names.includes(data.channel)) {
                    this._cacheTwitchEmote(key, data);
                }
            }

            return this.emotes.filter(e => e.type === 'twitch');
        });
    }

    /**
     * Fetches the BTTV emotes for a channel.
     * Use `null` for the global emotes channel.
     * @param {string} [name=null] - Name of the channel.
     * @returns {Promise<Collection<string, BTTVEmote>>}
     */
    fetchBTTVEmotes(name = null) {
        return this._getRawBTTVEmotes(name).then(rawEmotes => {
            for (const data of rawEmotes) {
                this._cacheBTTVEmote(name, data);
            }

            return this.channels.get(name).emotes.filter(e => e.type === 'bttv');
        });
    }

    /**
     * Fetches the FFZ emotes for a channel.
     * @param {string} name - Name of the channel.
     * @returns {Promise<Collection<string, FFZEmote>>}
     */
    fetchFFZEmotes(name) {
        return this._getRawFFZEmotes(name).then(rawEmotes => {
            for (const data of rawEmotes) {
                this._cacheFFZEmote(name, data);
            }

            return this.channels.get(name).emotes.filter(e => e.type === 'ffz');
        });
    }
}

module.exports = EmoteFetcher;

},{"../util/Collection":13,"../util/Constants":14,"./BTTVEmote":6,"./Channel":7,"./FFZEmote":11,"./TwitchEmote":12,"snekfetch":2}],10:[function(require,module,exports){
const Constants = require('../util/Constants');

class EmoteParser {
    /**
     * A parser to replace text with emotes.
     * @param {EmoteFetcher} fetcher - The fetcher to use the cache of.
     * @param {Object} [options={}] - Options for the parser.
     * @param {string} [options.template] - The template to be used.
     * The strings that can be interpolated are:
     * - `{link}` The link of the emote.
     * - `{name}` The name of the emote.
     * - `{size}` The size of the image.
     * - `{creator}` The channel/owner name of the emote.
     * @param {string} [options.type='markdown'] - The type of the parser.
     * Can be one of `markdown`, `html`, `bbcode`, or `plain`.
     * If the `template` option is provided, this is ignored.
     * @param {RegExp} [options.match=/:(.+?):/g] - The regular expression that matches an emote.
     * Must be a global regex, with one capture group for the emote code.
     */
    constructor(fetcher, options = {}) {
        /**
         * The emote fetcher being used.
         * @type {EmoteFetcher}
         */
        this.fetcher = fetcher;

        /**
         * The parser options.
         * @type {Object}
         */
        this.options = Object.assign({
            template: '',
            type: 'markdown',
            match: /:(.+?):/g
        }, options);

        this._validateOptions(this.options);
    }

    _validateOptions(options) {
        if (options.template && typeof options.template !== 'string') {
            throw new TypeError('Template must be a string');
        }

        if (!['markdown', 'html', 'bbcode', 'plain'].includes(options.type)) {
            throw new TypeError('Parse type must be one of `markdown`, `html`, `bbcode`, or `plain`');
        }

        if (!(options.match instanceof RegExp) || !options.match.global) {
            throw new TypeError('Match must be a global RegExp.');
        }
    }

    /**
     * Parses text.
     * @param {string} text - Text to parse.
     * @param {number} size - Size for emotes.
     * @returns {string}
     */
    parse(text, size = 0) {
        const parsed = text.replace(this.options.match, (matched, id) => {
            const emote = this.fetcher.emotes.get(id);
            if (!emote) return matched;

            const template = this.options.template || Constants.Templates[this.options.type];
            const link = emote.toLink(size);
            const res = template
                .replace(/{link}/g, link)
                .replace(/{name}/g, emote.code)
                .replace(/{size}/g, size)
                .replace(/{creator}/g, emote.ownerName || 'global');

            return res;
        });

        return parsed;
    }
}

module.exports = EmoteParser;

},{"../util/Constants":14}],11:[function(require,module,exports){
const Emote = require('./Emote');
const Constants = require('../util/Constants');

/** @extends Emote */
class FFZEmote extends Emote {
    /**
     * An FFZ emote.
     * @param {Channel} channel - Channel this emote belongs to.
     * @param {string} id - ID of the emote.
     * @param {data} data - The raw emote data.
     */
    constructor(channel, id, data) {
        super(channel, id, data);
        this.type = 'ffz';
    }

    /**
     * The channel of this emote's creator.
     * Not guaranteed to contain the emote, or be cached.
     * @readonly
     * @type {?Channel}
     */
    get owner() {
        return this.fetcher.channels.get(this.ownerName);
    }

    _setup(data) {
        super._setup(data);
        this.code = data.name;

        /**
         * The name of the emote creator's channel.
         * @type {string}
         */
        this.ownerName = data.owner.name;

        /**
         * Available image sizes.
         * @type {string[]}
         */
        this.sizes = Object.keys(data.urls);

        /**
         * The image type of the emote.
         * @type {string}
         */
        this.imageType = 'png';
    }

    /**
     * Gets the image link of the emote.
     * @param {number} size - The size of the image.
     * @returns {string}
     */
    toLink(size = 0) {
        size = this.sizes[size];
        return Constants.FFZ.CDN(this.id, size); // eslint-disable-line new-cap
    }
}

module.exports = FFZEmote;

},{"../util/Constants":14,"./Emote":8}],12:[function(require,module,exports){
const Emote = require('./Emote');
const Constants = require('../util/Constants');

/** @extends Emote */
class TwitchEmote extends Emote {
    /**
     * A Twitch emote.
     * @param {Channel} channel - Channel this emote belongs to.
     * @param {string} id - ID of the emote.
     * @param {data} data - The raw emote data.
     */
    constructor(channel, id, data) {
        super(channel, id, data);
        this.type = 'twitch';
    }

    /**
     * The name of the emote creator's channel.
     * Will be null for global emotes.
     * @type {?string}
     */
    get ownerName() {
        return this.channel.name;
    }

    /**
     * The channel of this emote's creator.
     * @readonly
     * @type {Channel}
     */
    get owner() {
        return this.channel;
    }

    _setup(data) {
        super._setup(data);

        /**
         * The set ID of the emote.
         * @type {?string}
         */
        this.set = data.set;

        /**
         * The description of the emote.
         * @type {?string}
         */
        this.description = data.description;

        /**
         * The image type of the emote.
         * @type {string}
         */
        this.imageType = 'png';
    }

    /**
     * Gets the image link of the emote.
     * @param {number} size - The size of the image, 0, 1, or 2.
     * @returns {string}
     */
    toLink(size = 0) {
        return Constants.Twitch.CDN(this.id, size); // eslint-disable-line new-cap
    }
}

module.exports = TwitchEmote;

},{"../util/Constants":14,"./Emote":8}],13:[function(require,module,exports){
/**
 * An extended Map with utility methods.
 * @class Collection
 */
class Collection extends Map {
    /**
     * Finds first matching value by property or function.
     * Same as `Array#find`.
     * @param {string|Function} propOrFunc - Property or function to test.
     * @param {any} [value] - Value to find.
     * @returns {any}
     */
    find(propOrFunc, value) {
        if (typeof propOrFunc === 'string') {
            if (typeof value === 'undefined') return null;
            for (const item of this.values()) {
                if (item[propOrFunc] === value) return item;
            }

            return null;
        }

        if (typeof propOrFunc === 'function') {
            let i = 0;
            for (const item of this.values()) {
                if (propOrFunc(item, i, this)) return item;
                i++;
            }

            return null;
        }

        return null;
    }

    /**
     * Filters cache by function.
     * Same as `Array#filter`.
     * @param {Function} func - Function to test.
     * @param {any} [thisArg] - The context for the function.
     * @returns {Collection}
     */
    filter(func, thisArg) {
        if (thisArg) func = func.bind(thisArg);

        const results = new this.constructor();

        let i = 0;
        for (const [key, item] of this) {
            if (func(item, i, this)) results.set(key, item);
            i++;
        }

        return results;
    }

    /**
     * Maps cache by function.
     * Same as `Array#map`.
     * @param {Function} func - Function to use.
     * @param {any} [thisArg] - The context for the function.
     * @returns {any[]}
     */
    map(func, thisArg) {
        if (thisArg) func = func.bind(thisArg);

        const array = new Array(this.size);
        let i = 0;
        for (const item of this.values()) {
            array[i] = func(item, i, this);
            i++;
        }

        return array;
    }
}

module.exports = Collection;

},{}],14:[function(require,module,exports){
module.exports = {
    Twitch: {
        All: 'https://twitchemotes.com/api_cache/v3/images.json',
        CDN: (id, size) => `https://static-cdn.jtvnw.net/emoticons/v1/${id}/${size + 1}.0`
    },
    BTTV: {
        Global: 'https://api.betterttv.net/2/emotes',
        Channel: name => `https://api.betterttv.net/2/channels/${name}`,
        CDN: (id, size) => `https://cdn.betterttv.net/emote/${id}/${size + 1}x`
    },
    FFZ: {
        Channel: name => `https://api.frankerfacez.com/v1/room/${name}`,
        CDN: (id, size) => `https://cdn.frankerfacez.com/emoticon/${id}/${size}`
    },
    Templates: {
        html: '<img class="twitch-emote twitch-emote-{size} src={link}">',
        markdown: '![{name}]({link} "{name}")',
        bbcode: '[img]{link}[/img]',
        plain: '{link}'
    }
};

},{}],15:[function(require,module,exports){

},{}],16:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],17:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],18:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":16,"./encode":17}]},{},[1])(1)
});
