let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
const slideThreshhold = 100;
const arrow = document.querySelector('.arrow-indicator');

window.addEventListener('touchstart', function(event) {
    touchStartX = event.touches[0].clientX;

    if (touchStartX < 50) {
        arrow.style.transform = 'translateX(-50px)';
    }
}, false);

window.addEventListener('touchmove', function(event) {
    touchEndX = event.touches[0].clientX;
    let deltaX = touchEndX - touchStartX;
    if (deltaX > 0 && touchStartX < 50) {
        arrow.style.transform = `translateX(${Math.min(deltaX, 50) - 50}px)`;
    }
}, false);

window.addEventListener('touchend', function(event) {
    touchEndX = event.changedTouches[0].clientX;

    if (touchStartX < 50 && touchEndX - touchStartX > slideThreshhold) {
        eval(back);
    }

    arrow.style.transform = 'translateX(-100%)';
}, false);

let lastTyped = 0;

function timeAgo(tstamp) {
    const currentTime = Date.now();
    const lastSeenTime = tstamp * 1000;
    const timeDifference = currentTime - lastSeenTime;
    const seconds = Math.floor(timeDifference / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
        return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
    }
}

function setTheme() {
    document.querySelector('html').classList = '';
    if (theme.get()) {
        if (theme.get() === 'light') {
            document.querySelector('html').classList.add('light');
        } else if (theme.get() === 'system') {
            if (window.matchMedia) {
            const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
            if (systemDark.matches) {
            } else {
                document.querySelector('html').classList.add('light');
            }
        }
        } else if (theme.get() === 'catppuccin-macchiato') {
            document.querySelector('html').classList.add('catppuccin-macchiato');
        } else if (theme.get() === 'oled') {
            document.querySelector('html').classList.add('oled');
        } else if (theme.get() === 'watermelon') {
            document.querySelector('html').classList.add('watermelon');
        } else if (theme.get() === 'thirteen') {
            document.querySelector('html').classList.add('thirteen');
        }
    } else {
        document.querySelector('html').classList.add('dark');
    }

    if (page === 'settings.appearance') {
        if (document.querySelector(`.theme-option.selected`)) {            
            document.querySelector('.theme-option.selected').classList.remove('selected');
        }
        if (theme.get()) {
            document.querySelector(`.theme-option.${theme.get()}`).classList.add('selected');
        } else {
            document.querySelector(`.theme-option.dark`).classList.add('selected');
        }
    }
}

function formatSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(2);
    return `${size} ${sizes[i]}`;
}

function meowerEmojis(content, emojis) {
    for (const emoji of emojis) {
        const tag = `&lt;:${emoji._id}&gt;`;
        const replacement = `<img src="https://uploads.meower.org/emojis/${emoji._id}" alt=":${emoji.name.sanitize()}:" title=":${emoji.name.sanitize()}:" class="emoji${content.trim() === `<p>${tag}</p>` ? ' big' : ''}" onclick="emojiInfoModal(${JSON.stringify(emoji).replace(/\"/g, '&quot;')})">`;
        content = content.replaceAll(tag, replacement);
    }
    return content;
}

function autoResize() {
    messageInput().style.height = '21px';
    messageInput().style.height = `${messageInput().scrollHeight + 1}px`;
}

function jumpToPost(id) {
    const post = document.getElementById(id);
    if (post) {
        post.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    post.classList.add('active');
    setTimeout(() => {
        post.classList.remove('active');
    }, 1000);
}

function reply(postId) {
    closeModal();
    const post = postCache[page].find(p => p._id === postId);
    if (post && document.querySelector(".replies-wrapper").childNodes.length < 10) {
        const box = document.createElement("div");
        box.classList.add('reply-send');
        box.dataset.replyId = postId;

        const reply = document.createElement("div");
        reply.classList.add("reply-pre");
        reply.innerHTML = `
            <div class="reply" onclick="jumpToPost('${post._id}')">
                ${icon.replyIn}
                <div class="reply-inner">
                    <div class="reply-avatar" style="--image: ${avatar(post.author).css}"></div>
                    <span class="reply-user">${post.author._id}</span>
                    <span class="reply-content">${post.p ? post.p.sanitize() : `<i>${post.attachments.length} attachment${post.attachments.length === 1 ? '' : 's'}</i>`}</span>
                </div>
            </div>
        `;

        const removeButton = document.createElement("div");
        removeButton.classList.add('remove-reply');
        removeButton.onclick = () => removeReply(box);
        removeButton.innerHTML = `${icon.cross}`;
        box.appendChild(reply);
        box.appendChild(removeButton);

        document.querySelector(".replies-wrapper").appendChild(box);
        messageInput().focus();
    }
}

function removeReply(element) {
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

function mention(postId) {
    closeModal();
    const post = postCache[page].find(p => p._id === postId);
    messageInput().value += `@${post.author._id} `;
    messageInput().focus();
    autoResize();
}

function copy(text) {
    const t = document.createElement('input');
    t.value = text;
    document.body.appendChild(t);
    t.select();
    document.execCommand('copy');
    document.body.removeChild(t);
}

function avatar(data) {
    const avatarUrl = data.avatar 
        ? `https://uploads.meower.org/icons/${data.avatar}` 
        : `assets/images/default.jpg`;

    return {
        url: avatarUrl,
        css: `url(${avatarUrl})`
    };
}

function postEmbeds(links) {
    if (links) {
        let embeddedElements = [];
        
        links.forEach(link => {
            const baseURL = link.split('?')[0];
            const fileExtension = baseURL.split('.').pop().toLowerCase();
            const fileName = baseURL.split('/').pop();
            
            let embeddedElement;
            
            if (link.includes('tenor.com') && settings.get('enableTenor') === 'true') {
                const tenorRegex = /\d+$/;
                const tenorMatch = link.match(tenorRegex);
                const tenorId = tenorMatch ? tenorMatch[0] : null;
                
                if (tenorId) {
                    embeddedElement = document.createElement('div');
                    embeddedElement.className = 'tenor-gif-embed';
                    embeddedElement.setAttribute('data-postid', tenorId);
                    embeddedElement.setAttribute('data-share-method', 'host');
                    embeddedElement.setAttribute('data-style', 'width: 100%; height: 100%; border-radius: 5px; max-width: 400px; aspect-ratio: 1 / 1; max-height: 400px;');
                    
                    embeddedElement.classList.add("media");

                    embeddedElements.push(embeddedElement);

                    let scriptTag = document.createElement('script');
                    scriptTag.setAttribute('type', 'text/javascript');
                    scriptTag.setAttribute('src', 'scripts/tenor.js');
                    document.body.appendChild(scriptTag);
                }
            }
        });

        return embeddedElements;
    }
}

function jumpTop() {
    if (settings.get('reduceMotion') === 'true') {
        content.scrollTo({ top: 0 });
    } else {
        content.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

document.addEventListener("keydown", function(event) {
    if (settings.get('sendOnReturn') === 'true') {
        if (messageInput() !== 'null' && messageInput() === document.activeElement && event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendPost();
        }
    }
    
    if (event.keyCode >= 48 && event.keyCode <= 90 && messageInput() !== 'null' && messageInput() === document.activeElement && settings.get('invisibleTyping') === 'false' && lastTyped+3000 < Date.now()) {
        lastTyped = Date.now();
        fetch(`https://api.meower.org/${page === "home" ? "" : "chats/"}${page}/typing`, {
            method: "POST",
            headers: { token: storage.get("token") }
        });
    }
});

addEventListener("DOMContentLoaded", () => {
    document.onpaste = (event) => {
        if (messageInput() === 'null' || page === "livechat") return;
        for (const file of event.clipboardData.files) {
            addAttachment(file);
        }
    };
});

function setAccessibility() {
    if (settings.get('reduceMotion') === 'true') {
        document.querySelector('html').classList.add('reduce-motion');
    }

    if (settings.get('underlineLinks') === 'true') {
        document.querySelector('html').classList.add('underline-links');
    }
}

function chatGestures() {
    let touchStartX = 0;
    let currentX = 0;
    let isSwiping = false;
    const maxSlide = -120;
    const swipeThreshold = 10;
    let openChat = null;
    
    document.querySelectorAll('.chat:not(.static)').forEach(chat => {
        const chatWrapper = chat.querySelector('.chat-wrapper');
    
        chat.addEventListener('touchstart', function(event) {
            if (openChat && openChat !== chat) {
                closeOptions(openChat);
            }
    
            touchStartX = event.touches[0].clientX;
            currentX = parseFloat(getComputedStyle(chatWrapper).transform.split(',')[4]) || 0;
            isSwiping = false;
            openChat = chat;
        });
    
        chat.addEventListener('touchmove', function(event) {
            let touchMoveX = event.touches[0].clientX;
            let deltaX = touchMoveX - touchStartX + currentX;
    
            isSwiping = Math.abs(deltaX) > swipeThreshold;
            deltaX = Math.max(maxSlide, Math.min(deltaX, 0));
    
            chatWrapper.style.transform = `translateX(${deltaX}px)`;
        });
    
        chat.addEventListener('touchend', function() {
            let finalPosition = parseFloat(getComputedStyle(chatWrapper).transform.split(',')[4]);
    
            if (finalPosition <= maxSlide / 2) {
                chatWrapper.style.transform = `translateX(${maxSlide}px)`;
                openChat = chat;
            } else {
                closeOptions(chat);
            }
    
            if (!isSwiping && event.target === chatWrapper) {
                const action = chatWrapper.getAttribute('data-action');
                if (action) eval(action);
                event.preventDefault();
            }
        });
    });

    document.addEventListener('touchstart', function(event) {
        if (openChat && !openChat.contains(event.target)) {
            closeOptions(openChat);
            openChat = null;
        }
    });

    document.querySelectorAll('.chat.static').forEach(chat => {
        const chatWrapper = chat.querySelector('.chat-wrapper');

        chat.addEventListener('touchend', function() {
            if (!isSwiping && event.target === chatWrapper) {
                const action = chatWrapper.getAttribute('data-action');
                if (action) eval(action);
                event.preventDefault();
            }
        });
    });

    
    function closeOptions(chat) {
        const chatWrapper = chat.querySelector('.chat-wrapper');
        chatWrapper.style.transition = 'background 0.2s cubic-bezier(.2,0,0,1), transform 0.2s';
        chatWrapper.style.transform = 'translateX(0)';

        setTimeout(() => {
            chatWrapper.style.transition = 'background 0.2s cubic-bezier(.2,0,0,1)';
        }, 200);
    }
}