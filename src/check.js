const inline = selector => {
    "use strict";

    const PingService = function(endpoint, config) {
        this._endpoint = endpoint;
        this._queue = {};
        this._fetched = {};
        this._resolvers = {};

        const doRequest = payload => (resolve, reject) => {
            const request = new XMLHttpRequest();
            request.timeout = config.REQUEST_TIMEOUT || 20000;

            const onTimeout = () => {
                console.error(
                    "Tenon-Check: Request to " +
                        payload +
                        " timed out after " +
                        request.timeout +
                        "ms."
                );
                reject(request.status);
            };

            const onStateChange = () => {
                let request_done = request.readyState === XMLHttpRequest.DONE;
                let http_ok = request.status === 200;

                if (!request_done) {
                    return;
                }

                if (http_ok) {
                    if (!request.responseText.length) {
                        return reject(request.status);
                    }

                    let response;

                    try {
                        response = JSON.parse(request.responseText);
                    } catch (e) {
                        reject(
                            "Tenon-Check: Bad response",
                            e,
                            request.responseText
                        );
                    }

                    return resolve(response);
                }

                return reject(request.status);
            };

            request.ontimeout = onTimeout;
            request.onreadystatechange = onStateChange;

            request.open("POST", endpoint);
            request.setRequestHeader("Content-Type", "application/json");
            request.send(payload);
        };

        this._request = function(payload) {
            return new Promise(doRequest(payload));
        };
    };

    PingService.prototype.queue = function(url) {
        let self = this;

        if (this._fetched.hasOwnProperty(url)) {
            return Promise.resolve(this._fetched[url]);
        }

        if (this._queue.hasOwnProperty(url)) {
            return this._queue[url];
        }

        const promise = new Promise(resolve => {
            self._resolvers[url] = inline => {
                self._fetched[url] = inline;
                resolve(inline);
            };
        });

        return (this._queue[url] = promise);
    };

    PingService.prototype.check = function(url) {
        let self = this;

        if (this._fetched.hasOwnProperty(url)) {
            return Promise.resolve(this._fetched[url]);
        }

        const data = JSON.stringify([{ url: url }]);
        let inline = true;

        return new Promise(resolve => {
            self._request(data)
                .then(data => {
                    let resolved = false;
                    Object.keys(data).forEach(key => {
                        if (resolved) {
                            return;
                        }
                        if (key === url) {
                            resolve(parseInt(data[key]) !== 200);
                            resolved = true;
                        }
                    });

                    if (!resolved) {
                        resolve(true);
                    }
                })
                .catch(() => resolve(true));
        });
    };

    PingService.prototype.runAll = function() {
        let self = this;

        const success = data => {
            let results = {};

            Object.keys(data).forEach(url => {
                results[url] = parseInt(data[url]) !== 200;
            });

            Object.keys(self._queue).forEach(url => {
                if (results.hasOwnProperty(url)) {
                    self._resolvers[url](results[url]);
                } else {
                    self._resolvers[url](true);
                }
            });
        };

        const fail = e => {
            Object.keys(self._resolvers).forEach(r => {
                self._resolvers[r](true);
            });
        };

        const structure = Object.keys(this._queue).reduce((prev, cur) => {
            prev.push({ url: cur });
            return prev;
        }, []);

        const data = JSON.stringify(structure);

        const handled = self
            ._request(data)
            .then(success)
            .catch(fail);

        return handled.then(() => {
            let promises = Object.keys(this._queue).map(url =>
                self._queue[url].then(inline => [url, inline])
            );

            return Promise.all(promises).then(results => {
                self._queue = {};
                self._resolvers = {};
                return results.reduce((set, result) => {
                    set[result[0]] = result[1];
                    return set;
                }, {});
            });
        });
    };

    let inlineService = (pingService, config) => {
        const makeTenonInline = mappers => selector => {
            const fetchDom = selector => {
                return Promise.resolve(document.querySelectorAll(selector));
            };

            const chain = (functions, args) => {
                const curried = functions.map(f => (index, intermediate) => {
                    let next = curried[index + 1];
                    if (next === undefined) {
                        return f(intermediate);
                    }
                    return f(intermediate).then(result =>
                        next(index + 1, result)
                    );
                });

                return curried[0](0, args);
            };

            const inlineAssets = dom => chain(mappers, [dom, []]);

            const flattenDom = dom => {
                let html = "";
                for (let node of dom) {
                    html += node.innerHTML;
                }
                return html;
            };

            return new Promise(resolve => {
                fetchDom(selector)
                    .then(inlineAssets)
                    .then(result => {
                        let [dom, assetPromises] = result;

                        Promise.all(assetPromises)
                            .then(() => flattenDom(dom))
                            .then(resolve);

                        pingService.runAll();
                    });
            });
        };

        const NOP = () => {};

        const pingTenon = (url, check) =>
            check ? pingService.check(url) : pingService.queue(url);

        const either = (inline, skip) => shouldInline =>
            shouldInline ? inline() : skip();

        const fetchAssetAsDataURL = url => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.addEventListener("loadend", () => {
                    resolve(reader.result);
                });

                reader.addEventListener("onerror", reject);

                fetchAssetAsBlob(url)
                    .then(result => reader.readAsDataURL(result.content))
                    .catch(reject);
            });
        };

        const fetchAssetAsBlob = url => _fetchAsset(url, true);
        const fetchAssetAsText = url => _fetchAsset(url, false);

        const _fetchAsset = (url, asBlob) => {
            return new Promise((resolve, reject) => {
                let request = new XMLHttpRequest();

                if (asBlob) {
                    request.responseType = "arraybuffer";
                }

                request.timeout = config.REQUEST_TIMEOUT || 2000;

                const onTimeout = () => {
                    console.error(
                        "Tenon-Check: Request to " +
                            url +
                            " timed out after " +
                            request.timeout +
                            "ms."
                    );
                    reject(request.status);
                };

                const onStateChange = () => {
                    let request_done =
                        request.readyState === XMLHttpRequest.DONE;
                    let http_ok = request.status === 200;

                    if (!request_done) {
                        return;
                    }

                    if (http_ok) {
                        if (
                            (asBlob && !request.response.byteLength) ||
                            (!asBlob && !request.responseText.length)
                        ) {
                            return reject(request.status);
                        }

                        let contentType = request.getResponseHeader(
                            "Content-Type"
                        );

                        let content = asBlob
                            ? new Blob([request.response], {
                                  type: contentType
                              })
                            : request.responseText;

                        let result = {
                            content: content,
                            contentType: contentType
                        };

                        return resolve(result);
                    }

                    return reject(request.status);
                };

                request.ontimeout = onTimeout;
                request.onreadystatechange = onStateChange;

                request.open("GET", url);
                request.send();
            });
        };

        const toFullPath = path => {
            const absolutePathRegex = /^http(?:s)?:\/\//;

            if (absolutePathRegex.test(path)) {
                return path;
            }

            let link = document.createElement("a");

            link.href = path;

            const segments = [
                link.protocol,
                "//",
                link.host,
                link.pathname,
                link.search,
                link.hash
            ];

            return segments.join("");
        };

        const getNodesInDom = (selector, dom) => {
            let nodes = [];

            for (let node of dom) {
                let selection = node.querySelectorAll(selector);
                for (let node of selection) {
                    nodes.push(node);
                }
            }

            return nodes;
        };

        const inlineImageUrls = css => {
            let fileRegex = /url\(\s*(["'])?([^"'\s]+)(?:\1)?\s*\)/g;
            let dataUriRegex = /^data:/;

            let matches = {};
            let match;

            while ((match = fileRegex.exec(css)) !== null) {
                let ref = match[2];
                if (dataUriRegex.test(ref)) {
                    continue;
                }
                matches[ref] = 1;
            }

            const base64Promises = Object.keys(matches).map(matchUrl => {
                const path = toFullPath(matchUrl);

                const inline = absoluteUrl => () => {
                    return fetchAssetAsDataURL(absoluteUrl)
                        .then(dataURL => {
                            while (css.indexOf(matchUrl) > -1) {
                                css = css.replace(matchUrl, dataURL);
                            }
                            return css;
                        })
                        .catch(e =>
                            console.error(
                                "Tenon-Check: Error inlining image url",
                                e
                            )
                        );
                };
                const skip = () => css;

                return pingTenon(path, "check").then(
                    either(inline(path), skip)
                );
            });

            return Promise.all(base64Promises).then(() => css);
        };

        const inlineImportUrls = css => {
            const importRegex = /@import\s+(?:url\((?:['"])(.*)?(?:['"])\)|(?:['"])(.*)?(?:['"]))[^;]*?;(?!\/\/ tenon-no-inline)/;

            const replaceCSS = (css, match, content) => {
                while (css.indexOf(match) > -1) {
                    css = css.replace(match, content);
                }
                return css;
            };

            const replaceImportStatements = function(css) {
                if (!importRegex.test(css)) {
                    return Promise.resolve(css);
                }

                const match = importRegex.exec(css);
                const url = match[1] || match[2];
                const statement = match[0];

                const path = toFullPath(url);

                return new Promise(resolve => {
                    const inline = url => () => {
                        return fetchAssetAsText(path)
                            .then(asset =>
                                replaceCSS(css, statement, asset.content)
                            )
                            .then(resolve)
                            .catch(() =>
                                resolve(
                                    replaceCSS(
                                        css,
                                        statement,
                                        "// tenon-no-inline"
                                    )
                                )
                            );
                    };

                    const skip = () =>
                        resolve(
                            replaceCSS(css, statement, "// tenon-no-inline")
                        );

                    pingTenon(path, "check")
                        .then(either(inline(path), skip))
                        .then(replaceImportStatements);
                });
            };

            return replaceImportStatements(css);
        };

        const buildMapper = (selector, mapper) => args => {
            let [dom, promises] = args;

            const nodes = getNodesInDom(selector, dom);

            if (!nodes.length) {
                return Promise.resolve([dom, promises]);
            }

            const result = [dom, promises.concat(nodes.map(mapper))];
            return Promise.resolve(result);
        };

        const selectors = [null];

        const createStyleNode = content => {
            const styleNode = document.createElement("style");
            styleNode.textContent = content;
            return styleNode;
        };

        const mappers = [
            buildMapper("img[src]", node => {
                if (node.src.match(/^data:/)) {
                    return Promise.resolve(node);
                }

                const path = toFullPath(node.src);

                const inline = url => () => {
                    return fetchAssetAsDataURL(url)
                        .then(dataUrl => (node.src = dataUrl))
                        .catch(e =>
                            console.warn(
                                "Tenon-Check: Could not inline external image: " +
                                    e
                            )
                        );
                };

                return pingTenon(path).then(either(inline(path), NOP));
            }),

            buildMapper("script[src]", node => {
                const path = toFullPath(node.src);

                const inline = url => () => {
                    return fetchAssetAsText(url)
                        .then(script => script.content)
                        .then(content => (node.textContent = content))
                        .then(() => node.removeAttribute("src"))
                        .catch(e =>
                            console.warn(
                                "Tenon-Check: Could not inline external script: " +
                                    e
                            )
                        );
                };

                return pingTenon(path).then(either(inline(path), NOP));
            }),


            buildMapper('link[rel="stylesheet"]', node => {
                const path = toFullPath(node.href);

                const inline = url => () => {
                    return fetchAssetAsText(url)
                        .then(styles => styles.content)
                        .then(inlineImportUrls)
                        .then(inlineImageUrls)
                        .then(content => createStyleNode(content))
                        .then(styleNode =>
                            node.parentNode.insertBefore(styleNode, node)
                        )
                        .then(() => node.remove())
                        .catch(e =>
                            console.warn(
                                "Tenon-Check: Could not inline external styles: " + e
                            )
                        );
                };

                return pingTenon(path).then(either(inline(path), NOP));
            }),

            buildMapper("style", node => {
                return inlineImportUrls(node.textContent)
                    .then(inlineImageUrls)
                    .then(content => (node.textContent = content))
                    .catch(e =>
                        console.warn(
                            "Tenon-Check: Could not inline inline styles: " + e
                        )
                    );
            })
        ];

        return makeTenonInline(mappers, config);
    };

    return inlineService(
        new PingService("https://demo.tenon.io/api/ping.php", {}),
        {}
    )(selector);
};

const request = (apiKey, apiUrl, pageSource, onSuccess, onError) => {
    const r = new XMLHttpRequest();

    r.onload = function() {
        if (r.status === 200) {
            return onSuccess(r.responseText);
        }

        onError(r.responseText);
    };

    const formData = new FormData();

    formData.append("key", apiKey);
    formData.append("src", pageSource);
    formData.append("fragment", 0);
    r.open("POST", apiUrl);

    r.send(formData);
};

const testSource = settings => {
    return source => {
        if (source.length > settings.maxSourceLength) {
            return Promise.reject("Document source too large");
        }

        const api = settings.instanceUrl + "/api/index.php";

        const apiFailure = reject => apiResponse => {
            try {
                const response = JSON.parse(apiResponse);
                reject(`${response.message}. (${response.info})`);
            } catch (e) {
                reject("Unexpected Tenon API response");
            }
        };

        return new Promise((resolve, reject) => {
            request(settings.apiKey, api, source, resolve, apiFailure(reject));
        });
    };
};

const showResults = testResults => {
    try {
        const results = JSON.parse(testResults);
        if (results.resultUrl) {
            document.location.href = results.resultUrl;
        }
    } catch (e) {
        alert("Tenon-Check: Unexpected API response, couldn't parse.");
    }
};

const getSource = (selector, inlineAssets) => {
    const getDom = selector => {
        const dom = document.querySelectorAll(selector);
        let html = "";
        for (let node of dom) {
            html += node.innerHTML;
        }
        return Promise.resolve(html);
    };

    return inlineAssets ? inline(selector) : getDom(selector);
};

/*
 * Respond to the extension button being clicked.
 */
chrome.runtime.onMessage.addListener((request, sender) => {
    // Ignore if not from extension
    if (sender.tab) {
        return;
    }

    if (request.message && request.message === "TEST_SOURCE") {
        if (!Object.keys(request.settings).length) {
            alert("Tenon-Check: The extension is not properly configured.");
            return;
        }
        getSource("html", request.settings.inline)
            .then(testSource(request.settings))
            .then(showResults)
            .catch(function(e) {
                alert(`Tenon-Check: Error testing page - ${e}`);
            });
    }
});

