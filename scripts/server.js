let reconnecting;

function setCaches() {
    usersCache = {};
    postCache = { livechat: [] };
    chatCache = {};
    blockedUsers = {};
    usersTyping = {};

    userList = {};
    favoritedChats = [];
    pendingAttachments = [];
    unreadInbox = '';
}

function main() {
    serverWebSocket = new WebSocket(server);

    serverWebSocket.addEventListener('error', function(event) {
        console.error(event);
    });

    serverWebSocket.onopen = () => {
        if (storage.get("token") != undefined && storage.get("username") != undefined) {
            console.info("Logging in...");
            serverWebSocket.send(JSON.stringify({
                cmd: "authpswd",
                val: {
                    username: storage.get("username"),
                    pswd: storage.get("token"),
                },
                listener: "auth",
            }));
        } else {
            loginPage();
        };
    };

    serverWebSocket.onclose = () => {
        console.info("Connection closed attempting to reconnect...");
        tooltip({'title':"Disconnected!",'icon':icon.alert});
        reconnecting = true;
        setTimeout(() => {
            main();
            setCaches();
            if (page === "chats" ) {
                chatsPage();
            } else if (chatCache[page]) {
                chatPage(page);
            } else if (page === 'home') {
                chatPage('home');
            }
        }, 5000);
        setTimeout(() => {
            if (page !== "chats") {
                chatList(true);
            }
        }, 10000);
    };

    serverWebSocket.onmessage = (event) => {
        if (!settings.get('disableLogs')) {
            console.log(event.data);
        }
        let data = JSON.parse(event.data);
        if (data.listener === "auth") {
            if (data.cmd === "auth") {
                storage.set("token", data.val.token);
                storage.set("username", data.val.username);
                console.info("Logged in as " + data.val.username);

                if (reconnecting) {
                    reconnecting = false;
                    tooltip({'title':"Reconnected!", 'icon':icon.check});
                }

                getUser(data.val.username);
                
                data.val.chats.forEach((chat) => {
                    chatCache[chat._id] = chat;
                });

                favoritedChats = data.val.account.favorited_chats;
                unreadInbox = data.val.account.unread_inbox;
                if (page === 'login' || page === 'chats' || !page) {
                    chatsPage();
                }

                data.val.relationships.forEach((relationship) => {
                    if (relationship.state === 2) {
                        blockedUsers[relationship.username] = true;
                    }
                });
            }
        } else if (data.cmd === "post" || data.cmd === "inbox_message") {
            let post = data.val;
            let postOrigin = post.post_origin;

            if (usersTyping[postOrigin] && post.author._id in usersTyping[postOrigin]) {
                clearTimeout(usersTyping[postOrigin][post.author._id]);
                delete usersTyping[postOrigin][post.author._id];
                renderTyping();
            }

            if (!(postOrigin in postCache)) postCache[postOrigin] = [];
            postCache[postOrigin].unshift(post);
            if (page === postOrigin) {
                document.querySelector(".posts").insertAdjacentHTML('afterbegin', createPost(post));
                
            } else {
                if (postCache[postOrigin].length > 25) postCache[postOrigin].length = 25;
            }
        } else if (data.cmd === "typing") {
            const chatId = data.val.chat_id;
            const username = data.val.username;
            if (username === storage.get("username")) return;
            if (!usersTyping[chatId]) usersTyping[chatId] = {};
            if (username in usersTyping[chatId]) {
                clearTimeout(usersTyping[chatId][username]);
            }
            usersTyping[chatId][username] = setTimeout(() => {
                if (username in usersTyping[chatId]) {
                    clearTimeout(usersTyping[chatId][username]);
                    delete usersTyping[chatId][username];

                    renderTyping();
                }
            }, 4000);
            renderTyping();
        } else if (data.cmd === "update_post") {
            let postOrigin = data.val.post_origin;
            if (postCache[postOrigin]) {
                index = postCache[postOrigin].findIndex(post => post._id === data.val._id);
                if (index !== -1) {
                    postCache[postOrigin][index] = Object.assign(
                        postCache[postOrigin][index],
                        data.val
                    );
                }
                if (page === postOrigin) {
                    if (document.getElementById(data.val._id)) {
                        document.getElementById(data.val._id).outerHTML = createPost(data.val);
                    } 
                }
            }
        } else if (data.cmd === "post_reaction_add" || data.cmd === "post_reaction_remove") {
            if (postCache[data.val.chat_id]) {
                const index = postCache[data.val.chat_id].findIndex(post => post._id === data.val.post_id);
                if (index !== -1) {
                const post = postCache[data.val.chat_id][index];
                const reactionIndex = post.reactions.findIndex(r => r.emoji === data.val.emoji);
                if (reactionIndex === -1) {
                    if (data.cmd === "post_reaction_add") {
                        post.reactions.push({ count: 1, emoji: data.val.emoji, user_reacted: data.val.username === storage.get("username") });
                    }
                } else {
                    if (data.cmd === "post_reaction_add") {
                        const reacted = data.val.username === storage.get("username") || post.reactions[reactionIndex].user_reacted;
                        post.reactions[reactionIndex] = {
                            count: post.reactions[reactionIndex].count += 1,
                            emoji: data.val.emoji,
                            user_reacted: reacted
                        };
                    } else if (data.cmd === "post_reaction_remove") {
                        post.reactions[reactionIndex] = {
                            count: post.reactions[reactionIndex].count - 1,
                            emoji: data.val.emoji,
                            user_reacted: data.val.username !== storage.get("username")
                        };
                        if (post.reactions[reactionIndex].count <= 0) {
                            post.reactions.splice(reactionIndex, 1);
                        }
                    }
                }
                postCache[data.val.chat_id][index] = post;
                }
                if (page === data.val.chat_id) {
                    document.getElementById(data.val.post_id).outerHTML = createPost(postCache[data.val.chat_id][index]);
                }
            }
        } else if (data.cmd === "delete_post") {
            if (data.val.chat_id in postCache) {
                const index = postCache[data.val.chat_id].findIndex(post => post._id === data.val.post_id);
                if (index !== -1) {
                    postCache[data.val.chat_id].splice(index, 1);
                }
                if (page === data.val.chat_id) {
                    if (document.getElementById(data.val.post_id)) {
                        document.getElementById(data.val.post_id).outerHTML = '';
                    }
                }
            }
        } else if (data.cmd === "create_chat") {
            chatCache[data.val._id] = data.val;
        } else if (data.cmd === "update_chat") {
            const chatId = data.val._id;
            if (chatId in chatCache) {
                chatCache[chatId] = Object.assign(
                    chatCache[chatId],
                    data.val
                );
            }
        } else if (data.cmd === "delete_chat") {
            if (chatCache[data.val.chat_id]) {
                delete chatCache[data.val.chat_id];
            }
            if (postCache[data.val.chat_id]) {
                delete postCache[data.val.chat_id];
            }
        } else if (data.cmd == "update_profile") {
            return new Promise((resolve, reject) => {      
                const username = data.val._id;  
                fetch(`https://api.meower.org/users/${username}`)
                    .then(resp => resp.json())
                    .then(data => {
                        usersCache[username] = data;
                        resolve(data);
                    })
                    .catch(error => {
                        console.error("Failed to fetch:", error);
                        reject(error);
                    });
            });
        } else if (data.cmd == 'ulist') {
            userList = data.val.trim().split(";");
            if (page === 'chats') {
                if (document.getElementById("home")) {
                    document.getElementById("home").querySelector(".chat-preview").innerText = `${userList.length - 1} Users Online`;
                }
            } else if (page === 'home') {
                document.querySelector(".chat-extra").innerHTML = `
                <span class="userlist">${userList.length - 1} Users Online</span>
                <span class="typing-indicator"></span>
                `;
            }
        }
}}

function getUser(username) {
    return new Promise((resolve, reject) => {
        if (username in usersCache) return resolve(usersCache[username]);

        fetch(`https://api.meower.org/users/${username}`)
            .then(resp => resp.json())
            .then(data => {
                usersCache[username] = data;
                resolve(data);
            })
            .catch(error => {
                console.error("Failed to fetch:", error);
                reject(error);
            });
    });
}

function getChat(chatId) {
    if (!["home", "inbox", "livechat"].includes(chatId)) {
        if (!chatCache[chatId]) {
            fetch(`https://api.meower.org/chats/${chatId}`, {
                headers: {token: localStorage.getItem("token")}
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error("Chat not found");
                    } else {
                        throw new Error('Network response was not ok');
                    }
                }
                return response.json();
            })
            .then(data => {
                chatCache[chatId] = data;
            })
            .catch(e => {
                openAlert({
                    title: "Error",
                    message: `Unable to open chat: ${e}`
                });
            });
        }
        return Promise.resolve(chatCache[chatId]);
    }
    return Promise.resolve(chatCache[chatId]);
}

async function loadPosts(pageNo) {
    const posts = document.querySelector(".posts");

    const chatId = page.valueOf();
    if (!(chatId in postCache)) postCache[chatId] = [];

    const cacheSkip = (pageNo-1) * 25;
    const cachedPosts = postCache[chatId].slice(cacheSkip, (cacheSkip+25)+1);
    for (const post of cachedPosts) {
        posts.innerHTML += createPost(post);
    }
    if (cachedPosts.length >= 25 || chatId === "livechat") {
        if (chatId === "livechat") document.querySelector(".skeleton-posts").style.display = "none";
        return;
    }

    var path;
    if (chatId === "home") path = "/home"
    else if (chatId === "inbox") path = "/inbox"
    else path = `/posts/${chatId}`;

    const response = await fetch(`https://api.meower.org${path}?page=${pageNo}`, {
        headers: {
            token: storage.get("token")
        }
    });
    const postsData = await response.json();

    if (postsData["page#"] === postsData.pages && postsData.autoget.length < 25) {
        document.querySelector(".skeleton-posts").style.display = "none";
        document.querySelector(".posts").setAttribute("data-loading-more", "");
    }

    const postsarray = postsData.autoget || [];
    if (postsarray.length === 0 && pageNo === 1) {
        document.querySelector(".skeleton-posts").style.display = "none";

        document.querySelector(".greeting").style.display = "flex";
        document.querySelector(".greeting").innerHTML = `
                <div class="greeting-inner"><span class="chat-title">No messages here yet...</span><span class="chat-preview">Send them a greeting!</span></div>
        `;
    }

    postsarray.forEach(post => {
        if (page !== chatId) {
            return;
        }
        const existingPost = postCache[chatId].findIndex(_post => _post._id === post._id);
        if (existingPost !== -1) {
            postCache[chatId][existingPost] = post;
            const postElement = document.getElementById(post._id);
            if (postElement) {
                postElement.outerHTML = createPost(post);
            }
        } else {
            postCache[chatId].push(post);
            posts.innerHTML += createPost(post);
        }
    });
}

function openUserChat(username) {
    for (const chat of Object.values(chatCache)) {
        if (chat.type === 1 && chat.members.includes(username)) {
            chatPage(chat._id);
            closeModal();
            return;
        }
    }

    fetch(`https://api.meower.org/users/${username}/dm`, {
        method: 'GET',
        headers: {
            'token': storage.get('token')
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        chatCache[data._id] = data;
        chatPage(data._id);
        closeModal();
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });
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

            let mediaElement = document.createElement("video");
            mediaElement.setAttribute("src", baseURL + '?preview');
            mediaElement.setAttribute("controls", "controls");
            mediaElement.setAttribute("playsinline", "");
            mediaElement.setAttribute("preload", "metadata");
            mediaElement.setAttribute("alt", fileName);
            mediaElement.setAttribute("title", fileName);
            mediaElement.classList.add("embed");
            
            element.appendChild(mediaElement);
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

async function sendPost() {
    if (messageInput().disabled) return;
    if (messageInput().value.trim() === "" && pendingAttachments.length === 0) return;
    const message = messageInput().value;
    const posts = document.querySelector(".posts");

    const editWrapper = document.querySelector(".edit-wrapper");

    if (editWrapper.hasAttribute("data-post-id")) {
        fetch(`https://api.meower.org/posts?id=${editWrapper.getAttribute("data-post-id")}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                token: storage.get("token")
            },
            body: JSON.stringify({ content: message })
        });
        cancelEdit();
    } else {
        messageInput().value = "";
        messageInput().disabled = true;
        autoResize();

        const replies = document.querySelector(".replies-wrapper");
        const replyToIds = Array.from(replies.childNodes).map(replyContainer => replyContainer.getAttribute("data-reply-id"));
        replies.innerHTML = "";

        const attachmentIds = [];
        for (const attachment of pendingAttachments) {
            autoResize();
            attachmentResp = await attachment.req;
            attachmentIds.push(attachmentResp.id);
        }
        pendingAttachments.length = 0;
        document.querySelector('.attachments-wrapper').innerHTML = '';
        messageInput().disabled = false;

        const nonce = Math.random().toString();

        getUser(storage.get("username")).then(data => {
            posts.insertAdjacentHTML('afterbegin', createPost({
                "_id": `placeholder-${nonce}`,
                "attachments": [],
                "author": {
                    "_id": `${storage.get("username")}`,
                    "avatar": data.avatar,
                    "avatar_color": data.avatar_color,
                    "flags": data.flags,
                    "pfp_data": data.pfp_data,
                    "uuid": data.uuid
                },
                "emojis": [],
                "error": false,
                "isDeleted": false,
                "p": `${message.sanitize()}`,
                "pinned": false,
                "post_id": "placeholder",
                "post_origin": "home",
                "reactions": [],
                "reply_to": [],
                "stickers": [],
                "t": 'sending...',
                "type": 1,
                "u": `${storage.get("username")}`
            }));
        });

        const response = await fetch(`https://api.meower.org/${page === "home" ? "home" : `posts/${page}`}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                token: storage.get("token"),
            },
            body: JSON.stringify({
                reply_to: replyToIds,
                content: message,
                attachments: attachmentIds.reverse(),
                nonce,
            })
        });

    }

    autoResize();
}

function renderTyping() {
    if (!(page in usersTyping)) return;
    const typing = Object.keys(usersTyping[page]);
    const typingElem = document.querySelector(".chat-extra").querySelector(".typing-indicator");
    const translations = {
        "one": "{user} is typing...",
        "two": "{user1} and {user2} are typing...",
        "multiple": "{user1}, {user2}, and {user3} are typing...",
        "many": "{count} people are typing..."
    };

    switch (typing.length) {
        case 0:
            typingElem.innerText = "";
            break;
        case 1:
            typingElem.innerText = translations.one.replace("{user}", typing[0]);
            break;
        case 2:
            typingElem.innerText = translations.two
                .replace("{user1}", typing[0])
                .replace("{user2}", typing[1]);
            break;
        // case 3:
        //     typingElem.innerText = translations.multiple
        //         .replace("{user1}", typing[0])
        //         .replace("{user2}", typing[1])
        //         .replace("{user3}", typing[2]);
        //     break;
        default:
            typingElem.innerText = translations.many.replace("{count}", typing.length);
            break;
    }
}
async function deletePost(postid) {
    try {
        const response = await fetch(`https://api.meower.org/posts?id=${postid}`, {
            method: "DELETE",
            headers: {
                "token": storage.get("token")
            }
        });

        if (response.ok) {
            closeModal();
            tooltip({'title':"Post Deleted!",'icon':icon.check});
        } else {
            console.error(`Error deleting post with ID ${postid}: ${response.status} - ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error deleting post:", error);
    }
}
function ping() {
    serverWebSocket.send(JSON.stringify({
        cmd: "ping",
        val: ""
    }));
}

function saveProfile() {
    let quote = document.getElementById("edit-quote").value;
    const pronouns = document.getElementById("edit-pronouns").value;
    const lastfmuser = document.getElementById("edit-lastfmuser").value;

    if (pronouns.trim() !== "") {
        quote = `${quote}\n\n[${pronouns}]\n\n|lastfm:${lastfmuser}|`;
    }

    const profilecolor = document.querySelector(".avatar-color").value.substring(1);
    const fileInput = document.querySelector(".avatar-input");
    const file = fileInput.files[0];

    const xhttp = new XMLHttpRequest();

    xhttp.onreadystatechange = function() {
        if (this.readyState == 4) {
            if (this.status == 200) {
                tooltip({'title':"Profile Updated!",'icon':icon.check});
                settingsProfile();
            } else {
                openAlert({
                    "title": "Error",
                    "message": "An error occurred while updating your profile."
                });
            }
        }
    };

    xhttp.open("PATCH", "https://api.meower.org/me/config");

    xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhttp.setRequestHeader("token", storage.get("token"));

    const data = {
        quote: quote,
        avatar_color: profilecolor
    };

    if (file) {
        const formData = new FormData();
        formData.append("file", file);
            fetch("https://uploads.meower.org/icons", {
                method: "POST",
                headers: {
                    "Authorization": storage.get("token")
                },
                body: formData
            })
            .then(uploadResponse => uploadResponse.json())
            .then(uploadData => {
                const avatarId = uploadData.id;
                data.avatar = avatarId;
                xhttp.send(JSON.stringify(data));
            })
            .catch(error => console.error('Error uploading file:', error));
    } else {
        xhttp.send(JSON.stringify(data));
    }
}

async function fetchChatData() {
    let chatDataList = [];

    let favedChats = Object.values(chatCache).filter(chat => favoritedChats.includes(chat._id)).sort((a, b) => {
        return b.last_active - a.last_active;
    });
    let unfavedChats = Object.values(chatCache).filter(chat => !favoritedChats.includes(chat._id)).sort((a, b) => {
        return b.last_active - a.last_active;
    });
    let sortedChats = favedChats.concat(unfavedChats);

    for (let chatData of sortedChats) {
        let chatInfo = {};
        
        chatInfo.nickname = chatData.nickname || `${chatData.members.find(v => v !== storage.get("username"))}`;
        chatInfo.nickname = chatInfo.nickname.sanitize();

        if (chatData.type === 0) {
            chatInfo.chatIcon = chatData.icon ? `https://uploads.meower.org/icons/${chatData.icon}` : 'assets/images/chat.jpg';
        } else {
            const user = chatData.members.find(v => v !== storage.get("username"));
            let userData = await getUser(`${user}`);
            chatInfo.chatIcon = avatar(userData).url;
            chatInfo.isOnline = userList.includes(user);
        }

        if (postCache[chatData._id] && postCache[chatData._id].length > 0) {
            let post = postCache[chatData._id][0];
            chatInfo.recentPost = post.p ? post.p : post.attachments ? post.attachments.length + ' Attachments' : '';
            chatInfo.recentAuthor = post.author ? post.author._id : null;
        } else {
            chatInfo.recentPost = '';
        }

        chatDataList.push(chatInfo);
    }
}

async function shareImage(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    const filesArray = [
      new File(
        [blob],
        url.split('/').pop(),
        {
          type: "image/jpeg",
          lastModified: new Date().getTime()
        }
     )
    ];

    let shareData = {
      files: filesArray,
    };

    if (!navigator.canShare) {
      closeImage();
      openAlert({
          title: 'Error',
          message: `Share API Unavailable`
      })
      return;
    }

    if (!navigator.canShare(shareData)) {
      closeImage();
      openAlert({
          title: 'Error',
          message: `Share data unavailable or invalid`
      })
      return;
    }
    navigator.share(shareData)
}

function toggleBlock(user) {
    let toggle;
    if (blockedUsers.hasOwnProperty(user)) {
        toggle = 0;
        delete blockedUsers[user];
    } else {
        toggle = 2;
        blockedUsers[user] = true;
    }
    
    fetch(`https://api.meower.org/users/${user}/relationship`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "token": storage.get("token")
        },
        body: JSON.stringify({
            state: toggle
        })
    })
    .then(response => response.json())
    .then(data => {
    })
    .catch(error => {
        console.error("error:", error);
    });
    closeModal();
    if (toggle === 2) {
        openAlert({
            title: 'Success',
            message: `${user} has been blocked.`
        })
    } else if (toggle === 0) {
        openAlert({
            title: 'Success',
            message: `${user} has been unblocked.`
        })
    }
    if (chatCache[page]) {
        chatPage(page);
    } else if (page === 'home') {
        chatPage('home');
    } else if (page === 'settings.safety') {
        settingsSafety();
    }
}

function deleteChat(chatId) {
    closeModal();
    delete chatCache[chatId];
    fetch(`https://api.meower.org/chats/${chatId}`, {
        method: "DELETE",
        headers: { token: storage.get("token") }
    });
    if (page === 'chats') {
        chatList();
    }
}


function favoriteChat(chatId) {
    favoritedChats = favoritedChats.filter(_chatId => chatCache[_chatId]);

    if (favoritedChats.includes(chatId)) {
        favoritedChats = favoritedChats.filter(_chatId => _chatId !== chatId);
    } else {
        favoritedChats.push(chatId);
    }
    fetch("https://api.meower.org/me/config", {
        method: "PATCH",
        headers: {
            token: storage.get("token"),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ favorited_chats: favoritedChats })
    });
    if (page === 'chats') {
        chatList();
    }
}