chrome.browserAction.onClicked.addListener(function (tab) {
    chrome.runtime.onMessage.addListener(function (message) {});

    chrome.storage.sync.get(null, function (settings) {
        chrome.tabs.sendMessage(tab.id, {settings: settings});
    });
});

