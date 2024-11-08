const plugins = [
    'quote',
    'sentfrom',
    'telemiau',
];

function setPlugins() {
    plugins.forEach(plugin => {
        if (storage.plugins.get(plugin) === true) {
            fetch(`src/plugins/${plugin}/index.js`)
                .then(response => response.text())
                .then(text => window.eval(text));
            console.warn(`Loaded plugin: ${plugin}`);
        }
    });
}

function pluginsPage() {
    page = `plugins`;

    titlebar.set(``);
    titlebar.clear(true);
    titlebar.show();
    titlebar.back(`settingsPage()`);

    navigation.show();
    content.classList.remove('max');
    content.scrollTo(0,0);
    content.style = ``;

    content.innerHTML = `
        <div class="settings">
        <span class="settings-title">Plugins</span>

        </div>
    `;

    plugins.forEach(plugin => {
        const pluginElement = document.createElement('div');
        pluginElement.classList.add('plugin-card');
        fetch(`src/plugins/${plugin}/manifest.json`)
            .then(response => response.json())
            .then(data => {
                pluginElement.innerHTML = `
                <div class="plugin-title">
                <span class="plugin-name">${data.name}<span class="plugin-version">v${data.version}</span></span></span>
                ${data.icon ? `<div class="plugin-icon" style="--image: url(src/plugins/${plugin}/${data.icon});"></div>` : ''}
                </div>
                <span class="plugin-description">${data.description}</span>
                <div class="plugin-options">
                <a class="plugin-author" href="${data.website}" target="_blank" >Created by ${data.author}</a>
                <button class="plugin-button" onclick="togglePlugin('${plugin}');">${storage.plugins.get(plugin) ? 'Disable' : 'Enable'}</button>
                </div>
                `;
            })

        content.querySelector('.settings').appendChild(pluginElement);
    });
}

function togglePlugin(plugin) {
    if (storage.plugins.get(plugin)) {
        storage.plugins.disable(plugin);
    } else {
        storage.plugins.enable(plugin);
    }
    openAlert({
        title: 'Refresh',
        message: 'Restart now to apply new plugins and their settings.',
        buttons: [
            { text: 'Restart Now', action: 'window.location.reload()'},
            { text: 'Later!', action: 'closeAlert();pluginsPage();' }
        ]
    });

    content.innerHTML = `
    <div class="settings">
    <span class="settings-title">Plugins</span>

    </div>
    `;
}