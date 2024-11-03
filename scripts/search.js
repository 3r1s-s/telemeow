function searchPage() {
    page = `search`;

    titlebar.set(`Search`);
    titlebar.clear(false);
    titlebar.show();
    titlebar.back(`chatsPage()`);

    navigation.show();
    content.classList.remove('max');
    content.scrollTo(0,0);
    content.style = ``;

    content.innerHTML = `
        <div class="search-page">
            <div class="search-outer">
                <div class="search-full">
                    <div class="search-full-inner">
                        ${icon.search}
                        <input type="text" placeholder="Search" class="search-input" id="search-input" oninput="searchResults();">
                    </div>
                </div>
            </div>
            <span class="search-header">Users</span>
            <div class="user-results"></div>
            <span class="search-header">Chats</span>
            <div class="chats-results"></div>
            <span class="search-header">Posts</span>
            <div class="post-results"></div>
        </div>
    `;

    const searchInput = document.getElementById('search-input');
    searchInput.focus();
    searchResults();
}

function searchResults() {
    const searchInput = document.getElementById('search-input');
    const searchValue = searchInput.value.toLowerCase();

    const userResults = document.querySelector('.user-results');
    const postResults = document.querySelector('.post-results');
    const chatsResults = document.querySelector('.chats-results');

    userResults.innerHTML = '';
    postResults.innerHTML = '';
    chatsResults.innerHTML = '';

    const userResultsList = Object.values(usersCache).filter(user => user._id.toLowerCase().includes(searchValue));
    userResultsList.forEach(user => {
        const userResult = document.createElement('div');
        userResult.classList.add('search-result');
        userResult.setAttribute('onclick', `openUserChat('${user._id}')`);
        userResult.innerHTML = `
            <div class="avatar-result" style="--image: ${avatar(user).css};"></div>
            <span class="search-result-name">${user._id.sanitize()}</span>
        `;
        userResults.append(userResult);
    });

    const postResultsList = Object.values(postCache).flat().filter(post => post.p.toLowerCase().includes(searchValue));
    postResultsList.slice(0, 25).forEach(post => {
        const postResult = document.createElement('div');
        postResult.classList.add('search-result');
        postResults.innerHTML += createSearchPost(post);
    });

    const chatResultsList = Object.values(chatCache).filter(chat => chat.nickname && chat.nickname.toLowerCase().includes(searchValue));
    chatResultsList.forEach(chat => {
        const chatResult = document.createElement('div');
        chatResult.classList.add('search-result');
        chatResult.setAttribute('onclick', `chatPage('${chat._id}')`);
        chatResult.innerHTML = `
            <div class="avatar-result" style="--image: url(${chat.icon ? `https://uploads.meower.org/icons/${chat.icon}` : `assets/images/chat.jpg`});"></div>
            <span class="search-result-name">${chat.nickname.sanitize()}</span>
        `;
        chatsResults.append(chatResult);
    });
}

function createSearchPost(data) {
    if (blockedUsers[data.author._id]) return ``;

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
                    <div class="reply">
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
                        <div class="reply">
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
        <div class="post" id="${data._id}" onclick="goToPost('${data.post_origin}', '${data._id}')">
            <div class="avatar-outer">
                <div class="avatar" style="--image: ${avatar(data.author).css}; --color: ${data.author.avatar_color}" onclick="openProfile('${data.author._id}')"></div>
            </div>
            <div class="post-wrapper">
                <div class="post-info">
                    <span class="post-author" onclick="openProfile('${data.author._id}')">${data.author._id}</span><span class="post-date">${date}</span>${data.edited_at ? `<span class="post-edited">(edited)</span>` : ``}
                </div>
                ${replies.outerHTML}
                <div class="post-content">${data.emojis ? meowerEmojis(md.render(data.p), data.emojis).highlight() : md.render(data.p).highlight()}</div>
                ${attachments.outerHTML}
                ${reactions.outerHTML}
            </div>
            <div class="post-buttons">
            </div> 
        </div>
        `;

    return post;
}

function goToPost(postOrigin, postId) {
    chatPage(postOrigin);
    setTimeout(() => {
        jumpToPost(postId);
    }, 100)
}