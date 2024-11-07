function commandsModal() {
    const botList = bots.map(bot => `<div class="menu-button" onclick="openCommandPage('${bot.name}')">${bot.name} ${icon.arrow}</div>`).join('');
    openModal({
        body: `
            <div class="menu-options">
                ${botList}
            </div>
            <span>This is kinda bad, i just want feedback and/or a direction to go in :3</span>
        `
    });
}

function openCommandPage(botName) {
    closeModal();

    setTimeout(() => {
        openModal({
            title: botName,
            body: `
                <div class="menu-options">
                ${bots.find(bot => bot.name === botName).commands.map(command => `<div class="menu-button" onclick="insertCommand('${botName}', '${command.name}', '${command.args}')">${command.name} ${command.args ? command.args.map(arg => `<span style='opacity: 0.5'>${arg}</span>`).join(' ') : icon.send}</div>`).join('')}
                </div>
                `
        })
    }, 500)
}

function insertCommand(botName, commandName, args) {
    messageInput().value += `@${botName} ${commandName} `;
    closeModal();
    messageInput().focus();
    if (args) {

    } else {
        sendPost();
    }
}


const bots = [
    {
      name: "h",
      commands: [
            { name: "help", args: [] },
            { name: "cat", args: [] },
            { name: "posts", args: ["user"] },
            { name: "isnoodlesmodyet", args: [] },
            { name: "math", args: ["expression"] },
      ],
    },
];
