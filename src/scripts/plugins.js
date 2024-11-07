function setPlugins() {
        if (storage.get('plugins')) {
        for (const plugin in storage.get('plugins')) {
            if (storage.get('plugins')[plugin].enabled) {
                try {
                    const code = storage.get('plugins')[plugin].code;
                    if (typeof code === 'string') {
                        eval(code);
                        console.info(`Loaded plugin: ${plugin}`);
                    } else {
                    }
                } catch (e) {
                }
            }
        }
    }
}
