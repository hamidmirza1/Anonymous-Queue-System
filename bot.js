require('dotenv').config();
const fs = require('fs');
const { Client, Intents, MessageActionRow, MessageButton, MessageEmbed, DiscordAPIError } = require('discord.js');
const KeyAuth = require('./KeyAuth');
const readline = require("readline");
const moment = require("moment");
const CRL = readline.createInterface({ input: process.stdin, output: process.stdout });

const KeyAuthApp = new KeyAuth(
    "", // Application Name
    "", // OwnerID
    "", // Application Secret
    "1.0" // Application Version
);


(async () => {
    await KeyAuthApp.Initialize();

    console.log("\n Application Data:");
    console.log(` Number of users: ${KeyAuthApp.app_data.numUsers}`);
    console.log(` Number of online users: ${KeyAuthApp.app_data.numOnlineUsers}`);
    console.log(` Number of keys: ${KeyAuthApp.app_data.numKeys}`);
    console.log(` Application Version: ${KeyAuthApp.app_data.version}`);
    console.log(` Customer panel link: ${KeyAuthApp.app_data.customerPanelLink}\n`);

    var username, password, license, email = "";

    await CRL.question("\n [1] Login\n [2] Register\n [3] Upgrade\n [4] License key only\n [5] Forgot password\n\n Choose option: ", async (option) => {
        option = await parseInt(option);

        switch (option) {
            case 1:
                await CRL.question("\n Whats your Username: ", async (user) => {
                    username = user;
                    await CRL.question(" Whats your Password: ", async (pass) => {
                        password = pass;
                        await KeyAuthApp.login(username, password);
                        Dashboard();
                        CRL.close();
                    });
                });
                break;
            case 2:
                await CRL.question("\n Whats your Username: ", async (user) => {
                    username = user;
                    await CRL.question(" Whats your Password: ", async (pass) => {
                        password = pass;
                        await CRL.question(" Whats your License: ", async (lic) => {
                            license = lic;
                            await CRL.question(" Whats your Email: ", async (email_) => {
                                email = email_;
                                await KeyAuthApp.register(username, password, license, email);
                                Dashboard();
                                CRL.close();
                            });
                        });
                    });
                });
                break;
            case 3:
                await CRL.question("\n Whats your Username: ", async (user) => {
                    username = user;
                    await CRL.question(" Whats your License: ", async (key) => {
                        license = key;
                        await KeyAuthApp.upgrade(username, license);
                        console.log("You have Successfully upgraded your account!");
                        process.exit(0);

                    });
                });
                break;
            case 4:
                await CRL.question("\n Whats your License: ", async (lic) => {
                    license = lic;
                    await KeyAuthApp.license(license);
                    Dashboard();
                    CRL.close();
                }
                );
                break;
            case 5:
                await CRL.question("\n Whats your Username: ", async (user) => {
                    username = user;
                    await CRL.question(" Whats your Email: ", async (email_) => {
                        email = email_;
                        await KeyAuthApp.forgot(username, email);
                        console.log(KeyAuthApp.response.message);
                        process.exit(0);

                    });
                });
                break;
            default:
                console.log("Invalid option");
                CRL.close();
                break;
        }

    });

    async function Dashboard() {
        console.log("\n Logged In!");

        //User Data
        console.log(` Username: ${KeyAuthApp.user_data.username}`);
        console.log(` IP address: ${KeyAuthApp.user_data.ip}`);
        console.log(` Hardware-Id: ${KeyAuthApp.user_data.hwid}`);
        console.log(
            ` Created at: ${moment
                .unix(KeyAuthApp.user_data.createdate)
                .format("DD-MM-YYYY - HH:mm:ss")}`
        );
        console.log(
            ` Last Login: ${moment
                .unix(KeyAuthApp.user_data.lastlogin)
                .format("DD-MM-YYYY - HH:mm:ss")}`
        );

        for (var i = 0; i < KeyAuthApp.user_data.subscriptions.length; i++) {
            console.log(
                ` [${i}] Subscription name: ${KeyAuthApp.user_data.subscriptions[i].subscription
                } | Expires at: ${moment
                    .unix(KeyAuthApp.user_data.subscriptions[i].expiry)
                    .format("DD-MM-YYYY - HH:mm:ss")} | Time left in seconds ${KeyAuthApp.user_data.subscriptions[i].timeleft
                }`
            );
        }
		
        console.log("\n\n Closing in 5 seconds...");
        await KeyAuthApp.sleep(5000);
        process.exit(0);

    }
}

const queue = [];
let matchCode = null;
let config = {}; // Define the config variable


const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.once('ready', async () => {
    console.log('Bot is ready!');
});

client.on('messageCreate', async message => {
    if (!message.guild || !message.member) return; // Check if the message is from a guild and sent by a member

    if (message.content.startsWith('!squeue')) {
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('You do not have permission to use this command.');
        }

        const channelId = message.content.split(' ')[1];
        if (!channelId) {
            return message.reply('Please provide a valid channel ID.');
        }

        process.env.QUEUE_CHANNEL_ID = channelId;
        message.reply(`Queue channel set to <#${channelId}>.`);
    }

    if (message.content.startsWith('!srole')) {
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('You do not have permission to use this command.');
        }

        const roleId = message.content.split(' ')[1];
        if (!roleId) {
            return message.reply('Please provide a valid role ID.');
        }

        process.env.STAFF_ROLE_ID = roleId;
        message.reply(`Staff role set to <@&${roleId}>.`);
    }

    if (message.content.startsWith('!logs')) {
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('You do not have permission to use this command.');
        }

        const channelId = message.content.split(' ')[1];
        if (!channelId) {
            return message.reply('Please provide a valid channel ID.');
        }

        process.env.LOG_CHANNEL_ID = channelId;
        message.reply(`Log channel set to <#${channelId}>.`);
    }

    if (message.content === '!queue') {
        const queueChannelId = process.env.QUEUE_CHANNEL_ID;
        if (!queueChannelId) {
            message.reply({ content: 'Queue channel is not set. Please use !setqueuechannel to set it.', ephemeral: true });
            return;
        }

        const queueChannel = message.guild.channels.cache.get(queueChannelId);
        if (!queueChannel) {
            message.reply({ content: 'Invalid queue channel. Please set a valid queue channel using !setqueuechannel.', ephemeral: true });
            return;
        }

        if (queue.length < 2) {
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('join_queue')
                        .setLabel('Join Queue 🏆')
                        .setStyle('PRIMARY')
                );

            const embed = new MessageEmbed()
                .setTitle('**Anon 2v2 Wager Queue**')
                .setDescription('*Note this is a wager for real money*')
                .setColor('#000000')
                .setThumbnail('https://cdn.discordapp.com/attachments/1195139268759269486/1220263890286415923/121.-Team-Synergy-Gaming-Logo-Vector-AI.png?ex=660e4e4e&is=65fbd94e&hm=7443c3c6480838d81befd1fb7c94e3d42be53914558e4af7b084ad5b3f7f4c96&')
                .setFooter('Synergy Development');

            queueChannel.send({ embeds: [embed], components: [row] });
        } else {
            queueChannel.send('Queue is full!');
        }
    }
    if (message.content === '!saveconfig') {
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('You do not have permission to use this command.');
        }

        config = {
            queueChannelId: process.env.QUEUE_CHANNEL_ID,
            staffRoleId: process.env.STAFF_ROLE_ID,
            logChannelId: process.env.LOG_CHANNEL_ID
        };

        saveConfig();
        message.reply('Configuration saved successfully.');
    }

    if (message.content === '!loadconfig') {
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('You do not have permission to use this command.');
        }

        loadConfig();
        message.reply('Configuration loaded successfully.');
    }

    // Command to load configuration
    if (message.content.startsWith('!loadconfig')) {
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('You do not have permission to use this command.');
        }

        const filePath = message.content.split(' ')[1];
        if (!filePath) {
            return message.reply('```100$````');
        }

        const success = loadConfig(filePath);
        if (success) {
            message.reply('Configuration loaded successfully.');
        } else {
            message.reply('```100%```');
        }
        
    } else if (message.content === '!help') {
        // Code for displaying help message...
        const embed = new MessageEmbed()
            .setTitle('Anon Queue System Setup 🎲')
            .setDescription('`Here are the available commands and their features:`')
            .addField('```!squeue <channel_id>```', '**💵 Set the queue channel for matches**')
            .addField('```!srole <role_id>```', '**🔨 Set the staff role for match management**')
            .addField('```!logs <channel_id>```', '**📃 Set the log channel for match logs**')
            .addField('```!queue```', '**🏆 Join the match queue**')
            .addField('```!saveconfig```', '**📑 Save the current configuration settings**')
            .addField('```!loadconfig```', '**📁 Load the saved configuration settings**')
            .setColor('#FF0000')
            .setFooter('Bot developed by Synergy Development');

        message.channel.send({ embeds: [embed] });
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    try {
        await handleButtonInteraction(interaction);
    } catch (error) {
        console.error('Error handling interaction:', error);
        if (error instanceof DiscordAPIError) {
            interaction.reply({ content: 'An error occurred while processing your request. Please try again later.', ephemeral: true });
        } else {
            interaction.reply({ content: 'An unexpected error occurred. Please contact the bot developer for assistance.', ephemeral: true });
        }
    }
});

async function handleButtonInteraction(interaction) {
    try {

    if (interaction.customId === 'join_queue') {
        // Handle join queue button
        if (queue.length < 2) {
            const user = interaction.user;
            queue.push(user);

            const embed = new MessageEmbed()
                .setTitle('Joined Queue')
                .setDescription('You have joined the queue. Please wait for another player.')
                .setColor('#000000')
                .setThumbnail('https://cdn.discordapp.com/attachments/1195139268759269486/1220263890286415923/121.-Team-Synergy-Gaming-Logo-Vector-AI.png?ex=660e4e4e&is=65fbd94e&hm=7443c3c6480838d81befd1fb7c94e3d42be53914558e4af7b084ad5b3f7f4c96&')
                .setFooter('Synergy Development');

            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('leave_queue')
                        .setLabel('Leave Queue')
                        .setStyle('DANGER')
                );

            interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        } else {
            interaction.reply({ content: 'Queue is full!', ephemeral: true });
        }

        if (queue.length === 2) {
            const [player1, player2] = queue;

            // Generate a single wager code for the match
            matchCode = generateWagerCode();

            // Create embed for match notification (including the code)
            const matchEmbed = new MessageEmbed()
            .setTitle('**2v2 Wager Found!**')
            .setDescription("`2v2`, wager has been started\n \n **Syn Dev wishes you the best, please head over to the wager channel!**")
            .setColor('#000000')
            .setThumbnail('https://cdn.discordapp.com/attachments/1195139268759269486/1220263890286415923/121.-Team-Synergy-Gaming-Logo-Vector-AI.png?ex=660e4e4e&is=65fbd94e&hm=7443c3c6480838d81befd1fb7c94e3d42be53914558e4af7b084ad5b3f7f4c96&')
            .setFooter('Synergy Development')
            .setAuthor('Syn Dev', 'https://cdn.discordapp.com/attachments/1220820486213210166/1220841586003542157/121.-Team-Synergy-Gaming-Logo-Vector-AI.png?ex=66106854&is=65fdf354&hm=6674c267e92762959e1269c5fa846bf593fd93c4a3502d2bfd49935a90567041&', 'https://example.com/syndev');

            // Send embed to both players
            try {
                await player1.send({ embeds: [matchEmbed] });
                await player2.send({ embeds: [matchEmbed] });
            } catch (error) {
                console.error('Error sending match notification DM:', error);
            }

            const channel = await interaction.guild.channels.create('private-channel', {
                type: 'text',
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: ['VIEW_CHANNEL'],
                    },
                    {
                        id: player1.id,
                        allow: ['VIEW_CHANNEL'],
                    },
                    {
                        id: player2.id,
                        allow: ['VIEW_CHANNEL'],
                    },
                ],
            });

            await channel.send(`${player1} ${player2}`);

            const embed = new MessageEmbed()
                .setTitle('**Match Started**')
                .setDescription(`**Team 1** ${player1}\n**Team 2** ${player2}.\n\n**Once you are finished, ask a staff member to mark the wager as complete!**`)
                .setColor('#000000')
                .setThumbnail('https://cdn.discordapp.com/attachments/1195139268759269486/1220263890286415923/121.-Team-Synergy-Gaming-Logo-Vector-AI.png?ex=660e4e4e&is=65fbd94e&hm=7443')
                .setFooter('Synergy Development');
            
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('conclude_game')
                        .setLabel('Conclude Game')
                        .setStyle('DANGER')
                );

            channel.send({ embeds: [embed], components: [row] });

            // Log match start in the specified channel
            const logChannel = client.channels.cache.get(process.env.LOG_CHANNEL_ID);
            const logEmbed = new MessageEmbed()
                .setTitle('Match Started')
                .setDescription(`The match has started between ${player1} and ${player2}.`)
                .addField('Wager Code', `*${matchCode}*`)
                .setColor('#000000')
                .setThumbnail('https://cdn.discordapp.com/attachments/1195139268759269486/1220263890286415923/121.-Team-Synergy-Gaming-Logo-Vector-AI.png?ex=660e4e4e&is=65fbd94e&hm=7443c3c6480838d81befd1fb7c94e3d42be53914558e4af7b084ad5b3f7f4c96&')
                .setFooter('Synergy Development');

            logChannel.send({ embeds: [logEmbed] });

            queue.length = 0; // Reset queue after creating the private channel
        }
    } else if (interaction.customId === 'leave_queue') {
        // Handle leave queue button
        const user = interaction.user;
        const index = queue.indexOf(user);

        if (index !== -1) {
            queue.splice(index, 1);
            interaction.reply({ content: 'You have left the queue.', ephemeral: true });
        } else {
            interaction.reply({ content: "You're not in the queue.", ephemeral: true });
        }
    } else if (interaction.customId === 'conclude_game') {
        // Handle conclude game button
        const channel = interaction.channel;

        // Check if user has the required role (ID: 1195134972403650600)
        if (channel && interaction.member.roles.cache.has(process.env.STAFF_ROLE_ID)) {
            let player1 = null, player2 = null;

            // Find players from channel permission overwrites
            for (const overwrite of channel.permissionOverwrites.cache.values()) {
                if (overwrite.allow.has('VIEW_CHANNEL') && overwrite.id !== interaction.guild.id) {
                    if (!player1) {
                        player1 = await client.users.fetch(overwrite.id);
                    } else if (!player2) {
                        player2 = await client.users.fetch(overwrite.id);
                        break; // Stop iterating after finding both players
                    }
                }
            }

            if (player1 && player2) {
                const logEmbed = new MessageEmbed()
                    .setTitle('**Match Ended**')
                    .setDescription(`The match between **${player1}** and **${player2}** has been ended by ${interaction.user}. \n \n Wager Code: **${matchCode}** `)
                    .setColor('#FF0000')
                    .setThumbnail('https://cdn.discordapp.com/attachments/1195139268759269486/1220263890286415923/121.-Team-Synergy-Gaming-Logo-Vector-AI.png?ex=660e4e4e&is=65fbd94e&hm=7443c3c6480838d81befd1fb7c94e3d42be53914558e4af7b084ad5b3f7f4c96&')
                    .setFooter('Synergy Development');

                client.channels.fetch(process.env.LOG_CHANNEL_ID)
                    .then(logChannel => {
                        logChannel.send({ embeds: [logEmbed] });
                    })
                    .catch(console.error);

                await channel.delete();
                interaction.reply({ content: 'The game has been concluded.', ephemeral: true });
            }
        } else {
            // Inform user they don't have permission
            interaction.reply({ content: "You don't have permission to conclude games!", ephemeral: true });
        }
    }
} catch (error) {
    console.error('Error handling interaction:', error);
    if (error instanceof DiscordAPIError) {
        // Use follow-up message instead of direct reply
        await interaction.followUp({ content: 'An error occurred while processing your request. Please try again later.', ephemeral: true });
    } else {
        // Use follow-up message instead of direct reply
        await interaction.followUp({ content: 'An unexpected error occurred. Please contact the bot developer for assistance.', ephemeral: true });
    }
}
}

function generateWagerCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 10; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

function saveConfig() {
    const filePath = 'config.json'; // Define the file path for the JSON file
    try {
        fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
        console.log('Configuration saved successfully.');
        return true;
    } catch (error) {
        console.error('Error saving configuration:', error);
        return false;
    }
}

function loadConfig(filePath = 'config.json') {
    try {
        const data = fs.readFileSync(filePath);
        config = JSON.parse(data);
        console.log('Configuration loaded:', config);
        // Set environment variables from the loaded config
        process.env.QUEUE_CHANNEL_ID = config.queueChannelId;
        process.env.STAFF_ROLE_ID = config.staffRoleId;
        process.env.LOG_CHANNEL_ID = config.logChannelId;
    } catch (error) {
        console.error('Error loading configuration:', error);
    }
}

client.login(process.env.DISCORD_TOKEN);
