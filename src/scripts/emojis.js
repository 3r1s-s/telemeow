function emojiModal(id) {

    document.querySelector(".modal-inner").innerHTML = ``;

    let chatEmojis = document.createElement('div');
    chatEmojis.classList.add('chat-emojis');

    let chatsRow = document.createElement('div');
    chatsRow.classList.add('chats-row');

    let emojiRow = document.createElement('div');
    emojiRow.classList.add('emoji-row');

    for (const chat of Object.values(chatCache)) {
        const customEmojis = chat.emojis;
        if (!customEmojis.length) continue;

        const emojisInner = document.createElement('div');
        emojisInner.classList.add('emojis-inner');

        const chatButton = document.createElement('div');
        chatButton.classList.add('chat-emoji-button');
        chatButton.id = chat._id;
        let chatIcon
        if (chat.icon) {
            chatIcon = `https://uploads.meower.org/icons/${chat.icon}`;
        } else {
            chatIcon = 'src/assets/images/chat.jpg';
        }
        chatButton.style.backgroundImage = `url('${chatIcon}')`;

        chatsRow.appendChild(chatButton);
    }

    const emojis = ["😃","😄","😁","😆","😅","😂","😭","😉","😗","😚","😘","😍","👍","👎", "👋"];
    emojis.forEach(emoji => {
        const emojiButton = document.createElement("div");
        emojiButton.classList.add("emoji-button");
        emojiButton.innerText = emoji;
        if (id) {
            emojiButton.setAttribute("onclick", `reactPost('${id}', '${emoji}')`);
        } else {
            emojiButton.setAttribute("onclick", `addEmoji('${emoji}')`);
        }

        emojiButton.innerText = emoji;
        emojiRow.appendChild(emojiButton);
    });

    openModal({
    bodyStyle: `overflow: hidden;height: 100%;`,
    body: `
    <div class="emojis-outer">
        ${emojiRow.outerHTML}
        ${chatEmojis.outerHTML}
        ${chatsRow.outerHTML}
    </div>
    `});

    document.querySelectorAll('.chat-emoji-button').forEach(button => {
        button.onclick = function() {
            emojiPage(chatCache[button.id].emojis, id);
        };
    });

    if (Object.values(chatCache).find(chat => chat.emojis.length > 0)) {
        emojiPage(Object.values(chatCache).find(chat => chat.emojis.length > 0).emojis, id);
    }
}

function emojiPage(customEmojis, id) {
    const emojis = document.querySelector('.chat-emojis');
    emojis.innerHTML = '';

    const emojisInner = document.createElement('div');
    emojisInner.classList.add('emojis-inner');

    for (const emoji of customEmojis) {
        const emojiDiv = document.createElement('div');
        emojiDiv.classList.add('emoji-button');
        emojiDiv.style.backgroundImage = `url('https://uploads.meower.org/emojis/${emoji._id}')`;
        emojiDiv.onclick = function() {
            if (id) {
                reactPost(id, emoji._id);
            } else {
                addEmoji('<:' + emoji._id + '>');
            }
        };
        emojisInner.appendChild(emojiDiv);
    }
    emojis.appendChild(emojisInner);
}

function addEmoji(emoji) {
    messageInput().setRangeText(emoji, messageInput().selectionStart, messageInput().selectionEnd, "end");
    autoResize();
    event.preventDefault();
    if (event) {
        if (!event.shiftKey) {
            closeModal();
            messageInput().focus();
        }
    }
    closeModal();
}

function reactPost(id, emoji, remove) {
    if (remove) {
        fetch(`https://api.meower.org/posts/${id}/reactions/${encodeURIComponent(emoji)}/@me`, {
            method: "DELETE",
            headers: {
                token: storage.get("token")
            }
        });
    } else {
        fetch(`https://api.meower.org/posts/${id}/reactions/${encodeURIComponent(emoji)}`, {
            method: "POST",
            headers: {
                token: storage.get("token")
            }
        });
    }
        closeModal();
}