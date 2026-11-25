
/*!
 * GOV.CY Unified Design System — standalone Theme reference implementation
 * Based on govcy.uds.js v3.3.0. EXPERIMENTAL: not production-ready.
 *
 * Load this file synchronously in <head> BEFORE the CSS to avoid a theme flash.
 * It resolves the theme immediately and attaches GOVCY.Theme after the existing
 * UDS bundle has loaded (normally at DOMContentLoaded).
 *
 * IMPORTANT: UDS v3.3.0 declares `let GOVCY`, not `window.GOVCY`.
 * Writing to window.GOVCY before the UDS bundle runs DOES NOT attach to that
 * lexical binding. This file therefore exposes window.govcyThemeReference
 * immediately, and attaches the same API to GOVCY.Theme when available.
 *
 * Optional configuration, defined BEFORE loading this script:
 *   window.govcyThemeConfig = {
 *     localTheme: 'light',       // non-persistent service override
 *     cookieDomain: 'auto',      // auto, null (host only), or explicit domain
 *     cookieMaxAgeDays: 365
 *   };
 *
 * For local testing on localhost, cookieDomain:'auto' uses a host-only cookie.
 * The API intentionally does not provide cross-origin synchronization yet.
 */
(function (window, document) {
  'use strict';

  var COOKIE_NAME = 'govcy-theme';
  var COOKIE_DOMAIN_AUTO = 'auto';
  var DEFAULT_DAYS = 365;
  var MODE_ATTRIBUTE = 'data-bs-theme';
  var MEDIA_QUERY = '(prefers-color-scheme: dark)';
  var SERVICE_COOKIE_DOMAIN = 'service.gov.cy';

  var config = {
    cookieDomain: COOKIE_DOMAIN_AUTO,
    cookieMaxAgeDays: DEFAULT_DAYS
  };

  var localOverride = null;
  var transientPreference = null;
  var media = null;
  var listenerRegistered = false;

  /**
   * Check that a theme preference is one of the three supported values.
   * @param {*} theme - Candidate value.
   * @returns {boolean} True for light, dark, or system.
   */
  function isPreference(theme) {
    return theme === 'light' ||
           theme === 'dark' ||
           theme === 'system';
  }

  /**
   * Return the cookie value as a plain string, or null if unavailable.
   * Cookie access may be blocked in privacy/sandboxed environments.
   * @returns {?string}
   */
  function readCookie() {
    var pieces, i, item, name;

    try {
      pieces = document.cookie ? document.cookie.split(';') : [];

      for (i = 0; i < pieces.length; i += 1) {
        item = pieces[i].replace(/^\s+/, '');
        name = COOKIE_NAME + '=';

        if (item.indexOf(name) === 0) {
          return decodeURIComponent(item.substring(name.length));
        }
      }
    } catch (error) {
      // Browser may disallow cookies. Continue in memory for this page.
    }

    return null;
  }

  /**
   * Resolve a safe domain for a cookie. Never try to set Domain=gov.cy.
   * @returns {?string} Domain attribute value or null for a host-only cookie.
   */
  function resolveCookieDomain() {
    var hostname = window.location && window.location.hostname;
    var requested = config.cookieDomain;
    var candidate;

    if (!hostname || requested === null || requested === '') {
      return null;
    }

    if (requested === COOKIE_DOMAIN_AUTO ||
        typeof requested === 'undefined') {

      if (hostname === SERVICE_COOKIE_DOMAIN ||
          hostname.slice(-(SERVICE_COOKIE_DOMAIN.length + 1)) ===
          '.' + SERVICE_COOKIE_DOMAIN) {
        return SERVICE_COOKIE_DOMAIN;
      }

      return null;
    }

    // A site can only set a cookie for its own host or an allowed parent.
    // Do not accept broad public suffixes; those are also rejected by browsers.
    candidate = String(requested).replace(/^\./, '').toLowerCase();

    if (candidate === 'gov.cy' ||
        candidate === 'cy' ||
        candidate === 'localhost' ||
        candidate.indexOf('.') < 0) {
      return null;
    }

    if (hostname === candidate ||
        hostname.slice(-(candidate.length + 1)) === '.' + candidate) {
      return candidate;
    }

    return null;
  }

  /**
   * Save a preference to a first-party cookie. A blocked cookie is not fatal.
   * @param {string} preference - light, dark, or system.
   * @returns {boolean} True if the cookie appears readable after writing.
   */
  function writeCookie(preference) {
    var parts = [
      COOKIE_NAME + '=' + encodeURIComponent(preference),
      'Path=/',
      'SameSite=Lax'
    ];

    var domain = resolveCookieDomain();
    var days = Number(config.cookieMaxAgeDays);

    if (!(days > 0) || !isFinite(days)) {
      days = DEFAULT_DAYS;
    }

    parts.push('Max-Age=' + Math.round(days * 24 * 60 * 60));

    if (window.location && window.location.protocol === 'https:') {
      parts.push('Secure');
    }

    if (domain) {
      parts.push('Domain=' + domain);
    }

    try {
      document.cookie = parts.join('; ');
      return readCookie() === preference;
    } catch (error) {
      return false;
    }
  }

  /**
   * Retrieve the saved preference. Invalid values behave as unset.
   * @returns {?string} light, dark, system, or null.
   */
  function getPreference() {
    var value = readCookie();

    // Explicit changes in this tab must still work if the cookie write failed.
    if (isPreference(transientPreference)) {
      return transientPreference;
    }

    if (isPreference(value)) {
      return value;
    }

    return null;
  }

  /**
   * Does the operating system currently request a dark colour scheme?
   * @returns {boolean}
   */
  function systemPrefersDark() {
    if (!window.matchMedia) {
      return false;
    }

    try {
      if (!media) {
        media = window.matchMedia(MEDIA_QUERY);
      }

      return !!media.matches;
    } catch (error) {
      return false;
    }
  }

  /**
   * Determine the active Light/Dark appearance (never returns system).
   * Priority: local service override > user cookie > default light.
   * @returns {'light'|'dark'}
   */
  function getResolvedTheme() {
    var preference = localOverride || getPreference() || 'light';

    if (preference === 'system') {
      return systemPrefersDark() ? 'dark' : 'light';
    }

    return preference;
  }

  /**
   * Apply the currently resolved theme to the HTML root.
   * @returns {'light'|'dark'} The applied theme.
   */
  function applyTheme() {
    var resolved = getResolvedTheme();

    document.documentElement.setAttribute(MODE_ATTRIBUTE, resolved);

    return resolved;
  }

  /**
   * Persist a user choice and apply it, respecting any local override.
   * @param {'light'|'dark'|'system'} preference - User's selection.
   * @returns {boolean} Whether the cookie was successfully persisted.
   * @throws {TypeError} If the value is not supported.
   */
  function setPreference(preference) {
    var saved;

    if (!isPreference(preference)) {
      throw new TypeError(
        'Theme preference must be light, dark, or system.'
      );
    }

    saved = writeCookie(preference);

    // Only use the in-memory value when cookie persistence was blocked.
    transientPreference = saved ? null : preference;

    applyTheme();

    return saved;
  }

  /**
   * Override the theme for this page only (does not update cookies).
   * Use null to clear the override and return to the saved preference.
   * @param {'light'|'dark'|'system'|null} theme - Temporary override.
   * @returns {'light'|'dark'} Currently applied theme.
   * @throws {TypeError} If the value is not supported.
   */
  function setLocalTheme(theme) {
    if (theme !== null && !isPreference(theme)) {
      throw new TypeError(
        'Local theme must be light, dark, system, or null.'
      );
    }

    localOverride = theme;

    return applyTheme();
  }

  /**
   * Configure storage and optionally set a non-persistent service override.
   * Calling init repeatedly is safe. Options are optional.
   *
   * @param {Object} [options] - Theme configuration.
   * @param {'light'|'dark'|'system'|null} [options.localTheme] - Override.
   * @param {string|null} [options.cookieDomain] - auto, explicit domain, or null.
   * @param {number} [options.cookieMaxAgeDays=365] - Cookie lifetime in days.
   * @returns {'light'|'dark'} Applied theme.
   */
  function init(options) {
    if (options && typeof options === 'object') {
      if (Object.prototype.hasOwnProperty.call(options, 'cookieDomain')) {
        config.cookieDomain = options.cookieDomain;
      }

      if (Object.prototype.hasOwnProperty.call(options, 'cookieMaxAgeDays')) {
        config.cookieMaxAgeDays = options.cookieMaxAgeDays;
      }

      if (Object.prototype.hasOwnProperty.call(options, 'localTheme')) {
        if (options.localTheme !== null &&
            !isPreference(options.localTheme)) {
          throw new TypeError(
            'localTheme must be light, dark, system, or null.'
          );
        }

        localOverride = options.localTheme;
      }
    }

    registerSystemListener();
    attachToUDS();

    return applyTheme();
  }

  /**
   * Respond to OS changes only when System is the effective preference.
   * Explicit light/dark and local overrides are never changed by OS changes.
   */
  function onSystemChange() {
    if ((localOverride || getPreference()) === 'system') {
      applyTheme();
    }
  }

  /**
   * Register the matchMedia listener with a fallback for older Safari.
   * Browsers without matchMedia simply use light in System mode.
   */
  function registerSystemListener() {
    if (listenerRegistered || !window.matchMedia) {
      return;
    }

    try {
      media = media || window.matchMedia(MEDIA_QUERY);

      if (media.addEventListener) {
        media.addEventListener('change', onSystemChange);
        listenerRegistered = true;
      } else if (media.addListener) {
        // Safari < 14 and older browsers used addListener instead.
        media.addListener(onSystemChange);
        listenerRegistered = true;
      }
    } catch (error) {
      // An unavailable media query must never break the page.
    }
  }

  /**
   * Attach to the existing GOVCY namespace when the original UDS bundle has
   * executed. `let GOVCY` is a global lexical binding, not window.GOVCY.
   * @returns {boolean} True when attachment succeeded.
   */
  function attachToUDS() {
    try {
      if (typeof GOVCY !== 'undefined' && GOVCY) {
        GOVCY.Theme = api;
        return true;
      }
    } catch (error) {
      // The bundle has not executed yet; we will retry at DOMContentLoaded.
    }

    return false;
  }

  var api = {
    init: init,
    getPreference: getPreference,
    setPreference: setPreference,
    setLocalTheme: setLocalTheme,
    getResolvedTheme: getResolvedTheme
  };

  // Keep the early API available for pages where UDS is not present.
  // This global is intentionally separate from the existing UDS `let GOVCY`.
  window.govcyThemeReference = api;

  // Resolve the initial appearance synchronously, before stylesheet loading.
  init(window.govcyThemeConfig || {});

  // The UDS bundle normally runs before DOMContentLoaded. Attach after it.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachToUDS);
  } else {
    attachToUDS();
  }
})(window, document);
