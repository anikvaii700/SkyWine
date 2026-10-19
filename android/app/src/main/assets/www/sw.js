/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "aec7ed508fc7afd72f9232d1aea6d265"
  }, {
    "url": "pwa-512x512.png",
    "revision": "3842dc602fd5898e7765e1adca3e1f66"
  }, {
    "url": "pwa-192x192.png",
    "revision": "c83409704b00e2cf398f5b519164c6f1"
  }, {
    "url": "index.html",
    "revision": "59331bb28a94d32cd15b553054928c29"
  }, {
    "url": "icon.svg",
    "revision": "09ac2d3d6b20fa580f8346a8ec64b736"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "e38acfc79975a1e9c5a7227b91608fbe"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/index-DW85YQfv.css",
    "revision": null
  }, {
    "url": "assets/index-Cq3e1xVn.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "e38acfc79975a1e9c5a7227b91608fbe"
  }, {
    "url": "icon.svg",
    "revision": "09ac2d3d6b20fa580f8346a8ec64b736"
  }, {
    "url": "pwa-192x192.png",
    "revision": "c83409704b00e2cf398f5b519164c6f1"
  }, {
    "url": "pwa-512x512.png",
    "revision": "3842dc602fd5898e7765e1adca3e1f66"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "aec7ed508fc7afd72f9232d1aea6d265"
  }, {
    "url": "manifest.webmanifest",
    "revision": "98872809ea67a93a76d393946aa30351"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
