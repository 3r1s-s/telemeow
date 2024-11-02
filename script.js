const server = 'wss://server.meower.org?v=1';
const home = 'https://eris.pages.dev/telemeow';

let page = '';
let back = '';

let bridges = ['Discord', 'SplashBridge', 'gc'];

let usersCache = {};
let postCache = { livechat: [] };  // {chatId: [post, post, ...]} (up to 25 posts for inactive chats)
let chatCache = {}; // {chatId: chat}
let blockedUsers = {}; // {user, user}
let usersTyping = {}; // {chatId: {username1: timeoutId, username2: timeoutId}}

let userList = {}; // {user, user}
let favoritedChats = [];  // [chatId, ...]
let pendingAttachments = [];
let unreadInbox = '';

let moderator = true;

const content = document.querySelector('.app').querySelector('.content');
const app = document.querySelector('.app');

const messageInput = () => document.querySelector('.message-input') || null;

const titlebar = (() => {
    const titlebar = document.querySelector('.titlebar');

    return {
        hide() {
            titlebar.style.display = 'none';
        },
        show() {
            titlebar.style.display = '';
        },
        set(title) {
            titlebar.querySelector('.titlebar .title').textContent = title;
        },
        back(backAction) {
            if (backAction) {
                titlebar.querySelector('.titlebar .titlebar-back').style.display = 'flex';
                titlebar.querySelector('.titlebar .titlebar-back').setAttribute('onclick', `${backAction}`)
                titlebar.querySelector('.titlebar .titlebar-back').innerHTML = `${icon.back}`
                back = `${backAction}`;
            } else {
                titlebar.querySelector('.titlebar .titlebar-back').style.display = 'none';
                back = '';
            }
        },
        clear(val) {
            if (val) {
                if (val === 'chat') {
                    titlebar.classList.remove('trans');
                    titlebar.classList.add('chat-trans');
                } else {
                    titlebar.classList.remove('chat-trans');
                    titlebar.classList.add('trans');
                }
            } else {
                titlebar.classList.remove('chat-trans');
                titlebar.classList.remove('trans');
            }
        }
    };
})();

const navigation = (() => {
    const nav = document.querySelector('.nav');

    return {
        hide() {
            nav.style.display = 'none';
        },
        show() {
            nav.style.display = '';
        },
    };
})();

const storage = (() => {
    let storagedata = {};

    try {
        storagedata = JSON.parse(localStorage.getItem('tele-data') || '{}');
    } catch (e) {
        console.error(e);
    }

    return {
        get(key) {
            return storagedata[key];
        },

        set(key, value) {
            storagedata[key] = value;
            localStorage.setItem('tele-data', JSON.stringify(storagedata));
        },

        delete(key) {
            delete storagedata[key];
            localStorage.setItem('tele-data', JSON.stringify(storagedata));
        },

        clear() {
            storagedata = {};
            localStorage.setItem('tele-data', JSON.stringify(storagedata));
        },

        settings: {
            get(key) {
                return storagedata && storagedata.settings && storagedata.settings[key];
            },

            set(key, value) {
                if (!storagedata.settings) {
                    storagedata.settings = {};
                }
                storagedata.settings[key] = value;
                localStorage.setItem('tele-data', JSON.stringify(storagedata));
            },

            delete(key) {
                if (storagedata.settings) {
                    delete storagedata.settings[key];
                    localStorage.setItem('tele-data', JSON.stringify(storagedata));
                }
            },

            clear() {
                if (storagedata.settings) {
                    storagedata.settings = {};
                    localStorage.setItem('tele-data', JSON.stringify(storagedata));
                }
            }
        }
    };
})();

const settings = storage.settings;

const theme = (() => {
    return {
        get() {
            return storage.get('theme');
        },
        set(theme) {
            storage.set('theme', theme);
            setTheme();
        }
    };
})();

String.prototype.sanitize = function() { 
    return this.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};

String.prototype.highlight = function() {
    return this.replace(/(^|\s|<p>)@([\w-]+)(?![^<]*?<\/code>)/g, (match, prefix, username) => {
        return `${prefix}<span id="username" class="highlight" onclick="openProfile('${username}')">@${username}</span>`;
    });
};

const device = {
    is: {
      iPhone: /iPhone/.test(navigator.userAgent),
      iPad: /iPad/.test(navigator.userAgent),
      iOS: /iPhone|iPad|iPod/.test(navigator.userAgent),
      android: /Android/.test(navigator.userAgent),
      mobile: /Mobi|Android/i.test(navigator.userAgent) // matches most mobile browsers
    },
    prefers: {
      language: navigator.language || navigator.userLanguage,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      reducedTransparency: window.matchMedia('(prefers-reduced-transparency: reduce)').matches
    },
    supports: {
      share: typeof navigator.share === 'function',
      directDownload: 'download' in document.createElement('a')
    },
    userAgent: navigator.userAgent
  };

setTheme();

setAccessibility();

function loginPage() {
    page = 'login';
    titlebar.set('Login');
    titlebar.clear(true);
    titlebar.show();
    titlebar.back();

    navigation.hide();

    content.classList.add('max');

    content.innerHTML = `
        <div class="login">
        <div class="logo-hero"></div>
        <div class="login-title">TeleMeow</div>
            <div class="login-form">
                <div class="login-input-container" id="login-username-container">
                    <input class="login-input" id="login-username" type="text">
                    <label for="login-username">Username</label>
                </div>
                <div class="login-input-container" id="login-pass-container">
                    <input class="login-input" id="login-pass" type="password">
                    <label for="login-pass">Password</label>
                </div>
                <div class="login-input-container" style="display: none;" id="login-2fa-container">
                    <input class="login-input" id="login-2fa" type="text">
                    <label for="login-2fa">Authentication Code</label>
                </div>
            </div>
            <button class="login-button" onclick="authenticate(document.getElementById('login-username').value, document.getElementById('login-pass').value, document.getElementById('login-2fa').value)">Login</button>
        </div>
    `;

    document.querySelectorAll('.login-input').forEach(function(input) {
        input.addEventListener('input', function() {
            if (this.value) {
                this.classList.add('filled');
            } else {
                this.classList.remove('filled');
            }
        });
    });
}

function login(user, pass) {
    serverWebSocket.send(JSON.stringify({
        cmd: "authpswd",
        val: {
            username: user,
            pswd: pass,
        },
        listener: "auth",
    }));
}

function authenticate(user, pass, otp) {
    let totp, recovery;
    if (otp.length === 6) {
        totp = otp;
    } else if (otp.length === 10) {
        recovery = otp;
    }

    fetch("https://api.meower.org/auth/login", {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            username: user,
            password: pass,
            totp_code: totp,
            mfa_recovery_code: recovery,
        }),
    }).then(resp => resp.json()).then(data => {
        if (data.type === "mfaRequired") {
            document.getElementById("login-pass-container").style.display = "none";
            document.getElementById("login-username-container").style.display = "none";
            document.getElementById("login-2fa-container").style.display = "block";
        } else {
            login(data.account._id, data.token);
        }
    });
}

function logout() {
    storage.clear();
    loginPage();
}

function chatsPage() {
    page = 'chats';
    document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
    document.querySelector('.nav').getElementsByClassName('nav-item')[0].classList.add('active');
    titlebar.set('TeleMeow');
    titlebar.clear(false);
    titlebar.show();
    titlebar.back();
    
    navigation.show();
    content.scrollTo(0,0);
    content.style = ``;
    content.classList.remove('max');

    content.innerHTML = `
        <div class="chats">
            ${skeletonChats()}
        </div>
    `;

    chatList();
}

async function chatList(x) {
    let chatList = '';
    if (storage.get("username") !== "eri" && storage.get("username") !== "Eris") {
        chatList += `
        <div class="warning">
            <div class="warning-text">
                <span>This is INCOMPLETE!</span>
                <small>Some things may not work, that is to be expected.</small>
            </div>
        </div>
        `;
    }

    if (settings.get("hideHome") !== 'true') {
        chatList += `
        <div class="chat favourite static" id="home">
            <div class="chat-wrapper" onclick="chatPage('home')">
                <div class="chat-icon-svg">${icon.home}</div>
                <div class="chat-text">
                    <span class="chat-title">Home</span>
                    <span class="chat-preview">${userList.length - 1} Users Online</span>
                </div>
            </div>
            <div class="chat-options">
                <div class="chat-option grey" onclick="settings.set('hideHome', 'true'); chatList();">${icon.hide}</div>
            </div>
        </div>
        `;
    }

    if (settings.get("hideInbox") !== 'true') {
        chatList += `
        <div class="chat favourite static" id="inbox">
            <div class="chat-wrapper" onclick="chatPage('inbox')">
                <div class="chat-icon-svg ${unreadInbox ? 'attention' : ''}">${icon.notifications}</div>
                <div class="chat-text">
                    <span class="chat-title">Inbox</span>
                    <span class="chat-preview"></span>
                </div>
            </div>
            <div class="chat-options">
                <div class="chat-option grey" onclick="settings.set('hideInbox', 'true'); chatList();">${icon.hide}</div>
            </div>
        </div>
        `;
    }

// put a gc icon next to gc names
    let sortedChats = [];
    let favedChats = Object.values(chatCache).filter(chat => favoritedChats.includes(chat._id)).sort((a, b) => {
        return b.last_active - a.last_active;
    });
    let unfavedChats = Object.values(chatCache).filter(chat => !favoritedChats.includes(chat._id)).sort((a, b) => {
        return b.last_active - a.last_active;
    });
    sortedChats = favedChats.concat(unfavedChats);

    for (let chatData of sortedChats) {
        let nickname;
        let chatIcon;
        let attention = '';
        let action = '';
        let isfave = favoritedChats.includes(chatData._id) ? 'favourite' : '';
        let recent ='';

        nickname = chatData.nickname || `${chatData.members.find(v => v !== storage.get("username"))}`;
        nickname = nickname.sanitize();
        if (chatData.type === 0) {
            if (chatData.icon) {
                chatIcon = `https://uploads.meower.org/icons/${chatData.icon}`;
            } else {
                chatIcon = 'assets/images/chat.jpg';
            }
        } else {
            const user = chatData.members.find(v => v !== storage.get("username"));
            userData = await getUser(`${user}`);
            chatIcon = avatar(userData).url;
            if (userList.includes(user)) {
                attention = 'online';
            }
        }
        // hide message if its from a blocked user
        if (postCache[chatData._id] && postCache[chatData._id].length > 0) {
            let postCont;
            if (postCache[chatData._id][0].p) {
                postCont = postCache[chatData._id][0].p || '';
            } else if (postCache[chatData._id][0].attachments) {
                postCont = postCache[chatData._id][0].attachments.length + ' Attachments';
            } else {
                postCont = '';
            }
            
            if (postCache[chatData._id][0].author && postCache[chatData._id][0].author._id === storage.get("username")) {
                recent = 'You: ' + (postCont || '').sanitize();
            } else if (postCache[chatData._id][0].author && postCache[chatData._id][0].author._id) {
                recent = `${postCache[chatData._id][0].author._id}: ` + (postCont || '').sanitize();
            }
        } else {
            recent = '';
        }

        action = `chatPage('${chatData._id}');`;

        chatList += `
            <div class="chat ${isfave}" id="${chatData._id}">
                <div class="chat-wrapper" onclick="${action}">
                    <div class="chat-icon ${attention}" style="--image: url('${chatIcon}')"></div>
                    <div class="chat-text">
                        <span class="chat-title">${nickname}</span>
                        <span class="chat-preview">${recent}</span>
                    </div>
                </div>
                <div class="chat-options">
                    <div class="chat-option blue" onclick="favoriteChat('${chatData._id}')">${isfave ? icon.starCross : icon.star}</div>
                    <div class="chat-option red" onclick="deleteChat('${chatData._id}')">${icon.delete}</div>
                </div>
            </div>
        `;
    }
    if (x) return;
    document.querySelector('.chats').innerHTML = chatList;

    chatScrolling();
}

function chatPage(chatId) {
    page = chatId;

    titlebar.set('');
    titlebar.clear('chat');
    titlebar.back(`chatsPage()`);

    navigation.hide();
    content.classList.remove('max');
    content.scrollTo(0,0);
    content.innerHTML = ``;

    let name;

    getChat(chatId).then(data => {
        if (page === chatId) {
            if (chatId === 'home') {
                name = 'Home';
            } else if (chatId === 'inbox') {
                name = 'Inbox';
            } else {
                if (data.nickname) {
                    name = data.nickname.sanitize();
                } else {
                    name = `${data.members.find(v => v !== storage.get("username"))}`;
                }
            }

            md.disable(['image']);

            let chatExtra;
            let chatNext;
            if (chatId === 'home') {
                chatExtra = `${userList.length - 1} Users Online`;
                chatNext = `homeModal();`;
            } else if (chatId === 'inbox') {
                chatExtra = 'Placeholder';
                chatNext = 'settingsNotifications()';
            } else if (data.type === 0) {
                chatExtra = `${data.members.length - 1} Members`;
                chatNext = `chatSettings('${chatId}')`;
            } else if (data.type === 1) {
                chatExtra = userList.includes(name) ? 'Online' : 'Offline';
                chatNext = `openProfile('${name}');`;
            }

            content.innerHTML = `
                <div class="chat-page">
                    <div class="chat-info" onclick="${chatNext}">
                        <span class="chat-name">${name}</span>
                        <span class="chat-extra">
                            <span class="userlist">${chatExtra}</span>
                            <span class="typing-indicator"></span>
                        </span>
                    </div>
                    <div class="message-container">
                        <div class="replies-wrapper"></div>
                        <div class="message-input-wrapper">
                            <div class="message-button" onclick="selectFiles()">${icon.add}</div>
                            <div class="message-input-container">
                                <textarea class="message-input" oninput="autoResize()" placeholder="Send a message to ${name}..."></textarea>
                            </div>
                            <div class="message-button" onclick="emojiModal();">${icon.emoji}</div>
                            <div class="message-button message-send" onclick="sendPost();">${icon.send}</div>
                        </div>
                        <div class="attachments-wrapper"></div>
                    </div>
                    <div class="posts">

                    </div>
                    <div class="skeleton-posts">
                        ${skeletonPosts()}
                    </div>
                    <div class="greeting" style="display: none;"></div>
                    <div class="jump" onclick="jumpTop();">${icon.up}</div>
                </div>
            `;

            loadPosts(1);

            content.addEventListener("scroll", async (event) => {
                if (document.querySelector('.jump')) {
                    if (content.scrollTop > 0) {
                        document.querySelector('.jump').classList.add('visible');
                    } else {
                        document.querySelector('.jump').classList.remove('visible');
                    }
                }
                if (!(page in postCache)) return;
                const skeletonHeight = document.querySelector(".skeleton-posts").scrollHeight;
                if (content.scrollHeight - content.scrollTop - skeletonHeight - content.clientHeight < 1) {
                    const posts = document.querySelector(".posts");
                    if (posts.hasAttribute("data-loading-more")) return;
                    posts.setAttribute("data-loading-more", "");
                    await loadPosts(Math.floor(posts.childElementCount / 25) + 1);
                    posts.removeAttribute("data-loading-more");
                }
            });
        }
    });
}

function createPost(data) {
    if (blockedUsers[data.author._id]) return `<div class="post-blocked"><span>Message Hidden</span></div>`;

    let attachments = document.createElement('div');
    attachments.classList.add('post-attachments');
    if (data.attachments && data.attachments.length > 2 && settings.get('disableMosaic') !== 'true') attachments.classList.add('attachment-grid');
    if (data.attachments) {        
        data.attachments.forEach(attachment => {
            const g = attach(attachment);
            attachments.appendChild(g);
        });
    }

    const embeddedElements = postEmbeds(data.p.match(/(?:https?|ftp):\/\/[^\s(){}[\]]+/g) || []);
    embeddedElements.forEach(element => {
        attachments.appendChild(element);
    });

    let reactions = document.createElement('div');
    reactions.classList.add('post-reactions');
    if (data.reactions) {        
        data.reactions.forEach(reaction => {
            let emoji;
            if (!reaction.emoji.match(/[\u1000-\uFFFF]/)) {
                emoji = `<img class="emoji" src="https://uploads.meower.org/emojis/${reaction.emoji.sanitize()}">`;
            } else {
                emoji = reaction.emoji;
            }

            reactions.innerHTML += `
                <div class="reaction ${reaction.user_reacted ? 'reacted' : ''}" onclick="reactPost('${data._id}', '${reaction.emoji}', ${reaction.user_reacted})">
                    <span class="reaction-count">${reaction.count}</span>
                    <span class="reaction-type">${emoji}</span>
                </div>
            `;
        });
    }

    let replies = document.createElement('div');
    replies.classList.add('post-replies');
    if (data.reply_to) {        
        data.reply_to.forEach(reply => {
            if (reply) {
                if (blockedUsers[reply.author._id]) {
                    replies.innerHTML += `
                    <div class="reply" onclick="jumpToPost('${reply._id}')">
                        ${icon.replyIn}
                        <div class="reply-inner">
                            <span class="reply-content"><i>Message Hidden<i></span>
                        </div>
                    </div>
                `;
                } else {
                    let replyCont;
                    if (reply.p) {
                        replyCont = reply.p.sanitize();
                    } else if (reply.attachments) {
                        replyCont = `<i>${reply.attachments.length} attachment${reply.attachments.length === 1 ? '' : 's'} ${icon.attachment}</i>`;
                    }
                    replies.innerHTML += `
                        <div class="reply" onclick="jumpToPost('${reply._id}')">
                            ${icon.replyIn}
                            <div class="reply-inner">
                                <div class="reply-avatar" style="--image: ${avatar(reply.author).css}"></div>
                                <span class="reply-user">${reply.author._id}</span>
                                <span class="reply-content">${replyCont}</span>
                                
                            </div>
                        </div>
                    `;
                }
            } else {
                replies.innerHTML += `
                <div class="reply">
                    ${icon.replyIn}
                    <div class="reply-inner">
                        <span class="reply-content"><i>Deleted post</i></span>
                    </div>
                </div>
            `;
            }
        });
    }

    let date;
    if (data.t === 'sending...') {
        date = 'sending...';
    } else {
        date = new Date(Math.trunc(data.t.e * 1000)).toLocaleString([], { month: '2-digit', day: '2-digit', year: '2-digit', hour: 'numeric', minute: 'numeric' });
    }

    if (data.author._id === 'Server') {
        let post = `
        <div class="post" id="${data._id}">
            <div class="avatar-outer">
            </div>
            <div class="post-wrapper">
                <div class="post-content server-post">${data.emojis ? meowerEmojis(md.render(data.p), data.emojis).highlight() : md.render(data.p).highlight()}</div>
                ${replies.outerHTML}
                ${attachments.outerHTML}
                ${reactions.outerHTML}
            </div>
        </div>
        `;

    return post;
    }

    let post = `
        <div class="post" id="${data._id}">
            <div class="avatar-outer">
                <div class="avatar" style="--image: ${avatar(data.author).css}; --color: ${data.author.avatar_color}" onclick="openProfile('${data.author._id}')"></div>
            </div>
            <div class="post-wrapper">
                <div class="post-info">
                    <span class="post-author" onclick="openProfile('${data.author._id}')">${data.author._id}</span><span class="post-date">${date}</span>
                </div>
                ${replies.outerHTML}
                <div class="post-content">${data.emojis ? meowerEmojis(md.render(data.p), data.emojis).highlight() : md.render(data.p).highlight()}</div>
                ${attachments.outerHTML}
                ${reactions.outerHTML}
            </div>
            <div class="post-buttons">
                <div class="post-button" onclick="postModal('${data._id}')">${icon.more}</div>
            </div> 
        </div>
        `;
    
    const placeholder = document.getElementById(`placeholder-${data.nonce}`);
    if (placeholder) placeholder.remove();

    return post;
}

function skeletonPosts() {
    return [...Array(5).keys()].map(i => `
        <div class="post" data-loading-more>
            <div class="avatar-outer">
                <span class="skeleton-avatar"></span>
            </div>
            <div class="post-wrapper">
                <span class="skeleton-text" style="width: ${Math.floor(Math.random() * (30 - 15 + 1)) + 15}%"></span>
                <div class="post-content">
                <span class="skeleton-text" style="width: ${Math.floor(Math.random() * (100 - 80 + 1)) + 80}%"></span>
                <span class="skeleton-text" style="width: ${Math.floor(Math.random() * (60 - 15 + 1)) + 15}%"></span>
                </div>
                <div class="post-attachments">
                    ${Math.floor(Math.random() * 3) ? '' : `<span class="skeleton-attachment" style="height: ${Math.floor(Math.random() * (600 - 200 + 1)) + 200}px"></span>`}
                </div>
            </div>
        </div>
    `).join('');
}

function skeletonChats() {
    return [...Array(10).keys()].map(i => `
        <div class="chat">
            <div class="chat-wrapper">
                <div class="skeleton-chat-icon"></div>
                <div class="skeleton-chat-text">
                    <span class="skeleton-chat-title" style="width: ${Math.floor(Math.random() * (40 - 20 + 1)) + 20}%"></span>
                    <span class="skeleton-chat-preview" style="width: ${Math.floor(Math.random() * (100 - 40 + 1)) + 40}%"></span>
                </div>
            </div>
        </div>
    `).join('');
}

function settingsPage() {
    page = 'settings';
    document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
    document.querySelector('.nav').getElementsByClassName('nav-item')[1].classList.add('active');
    titlebar.set('Settings');
    titlebar.clear(false);
    titlebar.show();
    titlebar.back();

    navigation.show();
    content.classList.remove('max');
    content.scrollTo(0,0);
    content.style = ``;

    content.innerHTML = `
        <div class="settings">
            <div class="settings-options">
                <div class="menu-button" onclick="settingsGeneral()"><span>General</span>${icon.arrow}</div>
                <div class="menu-button" onclick="settingsProfile()"><span>Profile</span>${icon.arrow}</div>
                <div class="menu-button" onclick="settingsAccounts()"><span>Accounts</span>${icon.arrow}</div>
                <div class="menu-button" onclick="settingsAppearance()"><span>Appearance</span>${icon.arrow}</div>
                <div class="menu-button"><span>Notifications</span>${icon.arrow}</div>
                <div class="menu-button"><span>Language</span>${icon.arrow}</div>
                <div class="menu-button"><span>Plugins</span>${icon.arrow}</div>
                <div class="menu-button" onclick="settingsSafety()"><span>Safety & Privacy</span>${icon.arrow}</div>
            </div>
            <div class="settings-options" style="display: ${settings.get('debugMode') === 'true' ? 'flex' : 'none'}">
                <div class="menu-button" onclick="debugPage()"><span>Debug</span>${icon.arrow}</div>
            </div>
            <div class="settings-options">
                <div class="menu-button" onclick="logout()"><span>Log Out</span>${icon.arrow}</div>
            </div>
            <div class="settings-about">
            <img src="assets/images/telemeow-icon.jpg" width="24px">
            <span style="font-weight: 600;">TeleMeow</span>
            <span style="font-size: 0.75em;opacity:0.6;">0.0.0</span>
            </div>
        </div>
    `;
}

function settingsGeneral() {
    page = `settings.general`;
    titlebar.set(`General`);
    titlebar.clear(false);
    titlebar.back(`settingsPage()`);

    navigation.show();
    content.classList.remove('max');
    content.scrollTo(0,0);
    content.style = ``;

    content.innerHTML = `
        <div class="settings">
            <span class="settings-options-title">Chats Visibility</span>
            <div class="settings-options">
                <div class="menu-button" id="hideHome" onclick="toggleSetting('hideHome')"><span>Hide Home</span><div class="toggle">${icon.check}</div></div>
                <div class="menu-button" id="hideInbox" onclick="toggleSetting('hideInbox')"><span>Hide Inbox</span><div class="toggle">${icon.check}</div></div>
            </div>
            <span class="settings-options-title">Chat</span>
            <div class="settings-options">
                <div class="menu-button" id="invisibleTyping" onclick="toggleSetting('invisibleTyping')"><span>Invisible Typing</span><div class="toggle">${icon.check}</div></div>
                <div class="menu-button" id="sendOnReturn" onclick="toggleSetting('sendOnReturn')"><span>Send on Return</span><div class="toggle">${icon.check}</div></div>
                <div class="menu-button" id="disableMosaic" onclick="toggleSetting('disableMosaic')"><span>Disable Attachment Mosaic</span><div class="toggle">${icon.check}</div></div>
                <div class="menu-button" id="enableTenor" onclick="toggleSetting('enableTenor')"><span>Enable Tenor GIFs</span><div class="toggle">${icon.check}</div></div>
            </div>
            <span class="settings-options-title">Accessibility</span>
            <div class="settings-options">
                <div class="menu-button" id="reduceMotion" onclick="toggleSetting('reduceMotion')"><span>Reduce Motion</span><div class="toggle">${icon.check}</div></div>
                <div class="menu-button" id="underlineLinks" onclick="toggleSetting('underlineLinks')"><span>Always Underline Links</span><div class="toggle">${icon.check}</div></div>
            </div>
            <span class="settings-options-sub">These require you to restart the client.</span>
            <span class="settings-options-title">Developer</span>
            <div class="settings-options">
                <div class="menu-button" id="debugMode" onclick="toggleSetting('debugMode')"><span>Enable Debug Mode</span><div class="toggle">${icon.check}</div></div>
                <div class="menu-button" id="disableLogs" onclick="toggleSetting('disableLogs')"><span>Disable websocket logs</span><div class="toggle">${icon.check}</div></div>
            </div>
        </div>
    `;

    const options = document.querySelectorAll('.menu-button');
    options.forEach(option => {
        if (settings.get(option.id) === 'true') {
            option.classList.add('checked');
        }
    });
}

function toggleSetting(id) {
    const element = document.getElementById(id);
    if (settings.get(id) === 'true') {
        element.classList.remove('checked');
        settings.set(id, 'false');
    } else {
        element.classList.add('checked');
        settings.set(id, 'true');
    }
}

function settingsProfile() {
    page = `settings.profile`;

    let quote;
    let pronouns;
    let attention = '';
    let recent;

    getUser(storage.get('username')).then(data => {
        titlebar.set(``);
        titlebar.clear(true);
        titlebar.back(`settingsPage()`);
    
        navigation.show();
        content.classList.remove('max');
        content.scrollTo(0,0);
        content.style = `background: var(--modal-400);`;

        md.disable(['image']);
        const regex = /\[(.*?)\]/;
        const newlineregex = /\n\n/g;
        const lastfmregex = /\|lastfm:([^|]+)\|/;
        const match = data.quote.match(regex);
        
        pronouns = match ? match[1] : "";
        let lastfmuser = data.quote.match(lastfmregex);
        lastfmuser = lastfmuser ? lastfmuser[1] : "";
        quote = data.quote.replace(regex, '');
        editquote = data.quote.replace(regex, '').replace(lastfmregex, '').replace(newlineregex, '');
        quote = md.render(quote).replace(/<a(.*?)>/g, '<a$1 target="_blank">');

        if (userList.includes(storage.get('username'))) {
            attention = 'online';
            recent = 'Online';
        } else {
            recent = `Last Seen: ${timeAgo(data.last_seen)}`;
        }

        content.innerHTML = `
            <div class="settings">
                <div class="profile-settings" style="--modal-accent: #${data.avatar_color};">
                    <div class="modal-banner" style="--banner-color: #${data.avatar_color}"></div>
                    <div class="edit-profile-icon" style="--image: ${avatar(data).css}">
                    </div>
                    <div class="modal-header"><span>${data._id}</span><span class="pronouns">${pronouns}</span></div>
                    <span class="edit-profile-title">Pronouns</span>
                    <input type="text" class="edit-profile-quote" value="${pronouns}" id="edit-pronouns">
                    <span class="edit-profile-title">Quote</span>
                    <textarea class="edit-profile-quote" id="edit-quote">${editquote}</textarea>
                    <span class="edit-profile-title">Last.fm Username</span>
                    <input type="text" class="edit-profile-quote" value="${lastfmuser}" id="edit-lastfmuser">
                    <span class="edit-profile-title">Avatar</span>
                    <div class="edit-profile-buttons">
                        <div class="settings-avatar-outer">
                            <input type="file" class="avatar-input" accept="image/png,image/jpeg,image/webp,image/gif">
                        </div> 
                        <div class="color-outer">
                            <div class="color-icon">
                                ${icon.swatch}
                            </div>
                            <input class="avatar-color" type="color" value="#${data.avatar_color}">
                        </div>
                    </div>
                    <div class="profile-section info"><span>Joined: ${new Date(data.created * 1000).toLocaleDateString()}</span><span class="divider"></span><span>${recent}</span></div>
                    <div class="save-profile-button" onclick="saveProfile()">Save Profile</div>
                </div>
            </div>
        `;
    });
}

function settingsAppearance() {
    page = `settings.appearance`;

    titlebar.set(`Appearance`);
    titlebar.clear(false);
    titlebar.back(`settingsPage()`);

    navigation.show();
    content.classList.remove('max');
    content.scrollTo(0,0);
    content.style = ``;

    content.innerHTML = `
        <div class="settings">
            <div class="theme-preview">
                <div class="post" id="b68ab58a-998e-4f4e-8814-5cd1fe2223bb">
                    <div class="avatar-outer">
                        <div class="avatar" style="--image: url(https://uploads.meower.org/icons/6jYao4k1dannG9oN32dBVLbK);"></div>
                    </div>
                    <div class="post-wrapper">
                        <div class="post-info">
                            <span class="post-author">eri</span><span class="post-date">22/10/24, 2:15 pm</span>
                        </div>
                        <div class="post-replies"></div>
                        <div class="post-content"><p>Regardez-moi je suis un beau papillon</p><p>Battant des ailes au clair de lune 🌝</p></div>
                        <div class="post-attachments"></div>
                        <div class="post-reactions"></div>
                    </div>
                </div>
            </div>
            <div class="theme-options">
                <div class="theme-option dark" onclick="theme.set('dark')" style="--app-500: #1a1825;">
                    <div class="theme-colour">
                    </div>
                    <div class="theme-name">
                        <span>Dark</span>
                    </div>
                </div>
                <div class="theme-option light" onclick="theme.set('light')">
                    <div class="theme-colour">
                    </div>
                    <div class="theme-name">
                        <span>Light</span>
                    </div>
                </div>
                <div class="theme-option catppuccin-macchiato" onclick="theme.set('catppuccin-macchiato')">
                    <div class="theme-colour">
                    </div>
                    <div class="theme-name">
                        <span>Twilight</span>
                    </div>
                </div>
                <div class="theme-option oled" onclick="theme.set('oled')">
                    <div class="theme-colour">
                    </div>
                    <div class="theme-name">
                        <span>OLED</span>
                    </div>
                </div>
                <div class="theme-option thirteen" onclick="theme.set('thirteen')">
                    <div class="theme-colour">
                    </div>
                    <div class="theme-name">
                        <span>Thirteen</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    setTheme();
}

function settingsAccounts() {
    page = `settings.accounts`;

    titlebar.set(`Accounts`);
    titlebar.clear(false);
    titlebar.back(`settingsPage()`);

    navigation.show();
    content.classList.remove('max');
    content.scrollTo(0,0);
    content.style = ``;

    content.innerHTML = `
        <div class="settings">
            
        </div>
    `;
}

function settingsSafety() {
    page = `settings.safety`;

    titlebar.set(`Safety & Privacy`);
    titlebar.clear(false);
    titlebar.back(`settingsPage()`);

    navigation.show();
    content.classList.remove('max');
    content.scrollTo(0,0);
    content.innerHTML = ``;
    content.style = ``;

    let blockedUsersSection = document.createElement('div');
    blockedUsersSection.classList.add('settings-options');

    const promises = Object.keys(blockedUsers).map(user => {
        if (blockedUsers[user]) {
            const g = document.createElement('div');
            g.classList.add('menu-button');
            g.setAttribute('onclick', `toggleBlock('${user}')`);
            
            return getUser(user).then(data => {
                g.innerHTML = `<span class="menu-user"><div class="avatar-small" style="--image: ${avatar(data).css};"></div>${user}</span><span>Unblock</span>`;
                blockedUsersSection.append(g);
            });
        }
        return Promise.resolve();
    });
    
    Promise.all(promises).then(() => {
        content.innerHTML = `
            <div class="settings">
                <span class="settings-options-title">Blocked Users</span>
                ${blockedUsersSection.outerHTML}
                <span class="settings-options-sub">Blocked users can't send you messages or add you to groups.</span>
            </div>
        `;
    });
    
}

function inboxPage() {
    page = `inbox`;

    titlebar.set(`Inbox`);
    titlebar.clear(false);
    titlebar.show();

    navigation.show();
    content.classList.remove('max');
    content.scrollTo(0,0);
    content.style = ``;

    content.innerHTML = `
        <div class="inbox">

        </div>
    `;
}

function debugPage() {
    page = `debug`;

    titlebar.set(`Debug`);
    titlebar.clear(false);
    titlebar.show();

    navigation.show();
    content.classList.remove('max');
    content.scrollTo(0,0);
    content.style = ``;

    let data = JSON.parse(localStorage.getItem('tele-data')).settings;

    content.innerHTML = `
        <div class="settings">
            <span class="settings-options-title">Device</span>
            <div class="json-block">${JSON.stringify(device, null, 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')}</div>
            <span class="settings-options-title">Settings</span>
            <div class="json-block">${JSON.stringify(data, null, 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')}</div>
            <span class="settings-options-title">LocalStorage</span>
            <div class="json-block">${JSON.stringify(JSON.parse(localStorage.getItem('tele-data')), null, 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')}</div>
        </div>
    `;
}