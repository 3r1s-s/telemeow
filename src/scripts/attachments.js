function addAttachment(file) {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    const element = document.createElement('div');

    const attachment = {file};
    attachment.req = new Promise((resolve, reject) => {
        attachment.cancel = (message) => {
            if (message) openAlert({title: "Error", message: 'There was an error uploading your attachment.'});
            xhr.abort();
            element.remove();
            pendingAttachments = pendingAttachments.filter(item => item !== attachment);
            reject(message);
        };
        pendingAttachments.push(attachment);

        if (file.size > (50 << 20)) {
            attachment.cancel("Files must not exceed 50MiB.");
            return;
        }

        element.classList.add("attach-pre-outer");
        element.innerHTML = `
        <div class="attachment-wrapper">
            <div class="attachment-progress" style="--pre: 0%;"><span>0%</span></div>
            <div class="delete-attach">${icon.cross}</div>
        </div>
        `;
        element.querySelector(".delete-attach").onclick = () => { attachment.cancel(""); };
        if (file.type.includes("image/") && file.size < (10 << 20)) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = document.createElement("img");
                img.classList.add("image-pre");
                img.src = reader.result;
                img.onclick = () => {
                    openImage(reader.result);
                };
    
                const attachmentMedia = document.createElement("div");
                attachmentMedia.classList.add("attachment-media");
                attachmentMedia.appendChild(img);

                const attachmentWrapper = element.querySelector(".attachment-wrapper")
                attachmentWrapper.insertBefore(attachmentMedia, attachmentWrapper.querySelector(".delete-attach"));
            };
            reader.readAsDataURL(file);
        } else {
            const fileType = document.createElement("span");
            fileType.classList.add("other-in");
            fileType.innerText = file.name.split('.').pop().toLowerCase();

            const attachmentOther = document.createElement("div");
            attachmentOther.classList.add("attachment-other");
            attachmentOther.appendChild(fileType);

            const attachmentWrapper = element.querySelector(".attachment-wrapper")
            attachmentWrapper.insertBefore(attachmentOther, attachmentWrapper.querySelector(".delete-attach"));
        }
        
        document.querySelector('.attachments-wrapper').appendChild(element);

        xhr.open("POST", "https://uploads.meower.org/attachments");
        xhr.setRequestHeader("Authorization", storage.get("token"));
        xhr.upload.onprogress = (ev) => {
            const percentage = `${Number((ev.loaded / ev.total) * 100).toFixed(2)}%`;
            element.querySelector(".attachment-progress").style.setProperty('--pre', `${percentage}`);
            element.querySelector(".attachment-progress span").innerText = percentage === "100.00%" ? "Processing..." : `${percentage}`;
        };
        xhr.onload = () => {
            element.querySelector(".attachment-progress").style.setProperty('--pre', `0`);
            const attachmentProgress = element.querySelector(".attachment-progress").querySelector("span");
            attachmentProgress.remove();

            resolve(JSON.parse(xhr.response));
        };
        xhr.onerror = (error) => {
            attachment.cancel(error);
            openAlert({title: "Error", message: error});
        };
        formData.append("file", file);
        xhr.send(formData);
    });
}

function selectFiles() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.click();
    input.onchange = function(e) {
        for (const file of e.target.files) {
            addAttachment(file);
        }
    };
}


function attach(attachment) {
    let link;
    if (attachment.filename) {
        link = `https://uploads.meower.org/attachments/${attachment.id}/${attachment.filename}`;
    } else {
        link = `https://uploads.meower.org/attachments/${attachment.id}`;
    }
    if (link) {
        const baseURL = link.split('?')[0];
        const fileName = baseURL.split('/').pop();

        let embeddedElement;

        if (attachment.mime.includes("image/") && attachment.size < (12 << 20)) {
            const element = document.createElement("div");
            element.classList.add("image-outer");

            let imgElement = document.createElement("img");
            imgElement.setAttribute("src", link + '?preview');
            imgElement.setAttribute("onclick", `openImage('${link}')`);
            imgElement.setAttribute("alt", fileName);
            imgElement.setAttribute("title", fileName);
            imgElement.classList.add("embed");

            element.appendChild(imgElement);
            embeddedElement = element;
        } else if (attachment.mime.includes("video/") && attachment.size < (12 << 20)) {
            const element = document.createElement("div");
            element.classList.add("media-outer");
            element.setAttribute("onclick", `openVideo('${link}?preview')`);

            let mediaElement = document.createElement("img");
            mediaElement.setAttribute("src", link + '?thumbnail');
            mediaElement.setAttribute("alt", fileName);
            mediaElement.setAttribute("title", fileName);
            mediaElement.classList.add("embed");
            
            element.appendChild(mediaElement);

            element.innerHTML += `
                <span class="play-button">${icon.play}</span>
            `;

            embeddedElement = element;
        } else if (attachment.mime.includes("audio/") && attachment.size < (12 << 20)) {

            const element = document.createElement("div");
            element.classList.add("media-outer");

            let mediaElement = document.createElement("audio");
            mediaElement.setAttribute("src", baseURL);
            mediaElement.setAttribute("controls", "controls");
            mediaElement.setAttribute("alt", fileName);
            mediaElement.setAttribute("title", fileName);
            mediaElement.classList.add("embed");
            
            element.appendChild(mediaElement);
            embeddedElement = element;
        } else {
            const element = document.createElement("div");
            element.classList.add("download");
            element.innerHTML = `
            <a href="${link}?download" target="_blank">${attachment.filename}</a>
            <small>${formatSize(attachment.size)}</small>
            `;
            embeddedElement = element;
        }
        return embeddedElement;
    }
}