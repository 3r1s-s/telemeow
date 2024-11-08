/*
 * Telemiau - a plugin for telemeow that replaces "telemeow" with "telemiau"
 * made by wlodekm using code copied from stackoverflow (eris pls add lang)
 */
var observeDOM = (function () {
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

    return function (obj, callback) {
        if (!obj || obj.nodeType !== 1) {
            return;
        }

        if (MutationObserver) {
            // define a new observer
            var mutationObserver = new MutationObserver(callback);

            // have the observer observe for changes in children
            mutationObserver.observe(obj, { childList: true, subtree: true });
            return mutationObserver;
        } else if (window.addEventListener) { // browser support fallback
            obj.addEventListener('DOMNodeInserted', callback, false);
            obj.addEventListener('DOMNodeRemoved', callback, false);
        }
    }
})();


//------------< DEMO BELOW >----------------


// Observe a specific DOM element:
observeDOM(document.body, function (m) {
    var addedNodes = [], removedNodes = [];

    m.forEach(record => record.addedNodes.length & addedNodes.push(...record.addedNodes));

    m.forEach(record => record.removedNodes.length & removedNodes.push(...record.removedNodes));
    addedNodes.forEach(n => { if (n.nodeType == Node.TEXT_NODE) { console.log(n.textContent); n.textContent = n.textContent.replaceAll(/telemeow/gi, "telemiau") } })
});