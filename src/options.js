const saveSettings = () => {
    let settings = {};
    let instanceUrl = document.querySelector('#instanceUrl').value;
    let apiKey = document.querySelector('#apiKey').value;
    let inline = document.querySelector('#inline').checked;

    if (apiKey !== undefined) {
        settings.apiKey = apiKey;
    }

    settings.instanceUrl = instanceUrl ? instanceUrl : 'https://tenon.io';

    settings.inline = !!inline;

    chrome.storage.sync.set(settings, function () {
        console.debug('Tenon-Check: settings saved');
    });
}

const setupForm = () => {
    const MAX_SOURCE_LENGTH = 120000;

    chrome.storage.sync.get(null, function (settings) {
        settings.maxSourceLength = MAX_SOURCE_LENGTH;
        settings.instanceUrl !== undefined ? document.querySelector('#instanceUrl').value = settings.instanceUrl :  document.querySelector('#instanceUrl').value = 'https://www.tenon.io';

        if (settings.apiKey !== undefined) {
            document.querySelector('#apiKey').value = settings.apiKey;
        }

        document.querySelector('#inline').checked = !!settings.inline;
    });

    document.querySelector('button').addEventListener('click', saveSettings);
}

document.addEventListener('DOMContentLoaded', setupForm);
