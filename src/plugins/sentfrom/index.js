const originalFunction = sendPost
sendPost = function(){
    const editWrapper = document.querySelector(".edit-wrapper");
    if (editWrapper.hasAttribute("data-post-id")) {
        originalFunction();
    } else {
        let ua;
        switch (true) {
            case device.is.iPhone:
                ua = 'my iPhone';
                break;
            case device.is.iPad:
                ua = 'my iPad';
                break;
            case device.is.iPod:
                ua = 'my iPod';
                break;
            case device.is.android:
                ua = 'my Android';
                break;
            default:
                ua = 'something';
                break;
        }
        messageInput().value = messageInput().value + `
***
###### Sent from ${ua}`
        originalFunction();
    }
}