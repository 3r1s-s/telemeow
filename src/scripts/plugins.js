const plugins = [
    'quote'
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