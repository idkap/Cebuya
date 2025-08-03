const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus
} = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const fs = require('fs');
const schedule = require('node-schedule');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const PREFIX = 'oten!';
const TOKEN = process.env.TOKEN;
const REMINDER_CHANNEL_ID = '1371269267311296584'; // Replace with your actual channel ID

let audioPlayer = null;

// =============== 🔁 Reminder State ================
const reminderPath = './reminder.json';
let reminderState = { enabled: true };

if (fs.existsSync(reminderPath)) {
  reminderState = JSON.parse(fs.readFileSync(reminderPath, 'utf8'));
} else {
  fs.writeFileSync(reminderPath, JSON.stringify(reminderState, null, 2));
}

const saveReminderState = () => {
  fs.writeFileSync(reminderPath, JSON.stringify(reminderState, null, 2));
};

// =============== 🤖 Bot Ready ================
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// =============== 💬 Message Handler ================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // BELATTTT!
  if (message.content.toLowerCase().includes('oten')) {
    message.channel.send('BELATTTT!');
  }

  // =============== 🎶 Music Command: oten!play [URL] ================
  if (message.content.startsWith(`${PREFIX}play`)) {
    const args = message.content.split(' ');
    const song = args.slice(1).join(' ');

    if (!song) return message.channel.send('❗ Please provide a YouTube URL.');

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.channel.send('❌ You need to join a voice channel first!');

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      const stream = ytdl(song, {
        filter: 'audioonly',
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
      });

      const resource = createAudioResource(stream);
      audioPlayer = createAudioPlayer();
      audioPlayer.play(resource);
      connection.subscribe(audioPlayer);

      message.channel.send(`🎶 Now playing: ${song}`);

      audioPlayer.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });

      audioPlayer.on('error', (error) => {
        console.error('AudioPlayer Error:', error);
        message.channel.send('❌ Error during playback.');
      });

    } catch (error) {
      console.error('Error in play command:', error);
      message.channel.send('❌ Could not play the song. Make sure the URL is valid.');
    }
  }

  // =============== ⏭ Skip Music ================
  if (message.content.startsWith(`${PREFIX}skip`)) {
    if (audioPlayer) {
      audioPlayer.stop();
      message.channel.send('⏭️ Skipped the song!');
    } else {
      message.channel.send('❌ No song is currently playing.');
    }
  }

  // =============== 🧱 Wall of Shame ================
  if (message.content.startsWith(`${PREFIX}wos`)) {
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const subcommand = args[0];

    const wosPath = './wos.json';
    let wosData = {};

    if (fs.existsSync(wosPath)) {
      wosData = JSON.parse(fs.readFileSync(wosPath, 'utf8'));
    }

    const saveWosData = () => {
      fs.writeFileSync(wosPath, JSON.stringify(wosData, null, 2));
    };

    if (subcommand === 'score') {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply("🚫 Only staff can update the Wall of Shame.");
      }

      const user = message.mentions.users.first();
      const score = parseInt(args[2]);

      if (!user || isNaN(score)) {
        return message.reply("Usage: `oten!wos score @user 50`");
      }

      wosData[user.id] = score;
      saveWosData();

      return message.reply(`✅ Updated ${user.username}'s shame score to ${score}.`);
    }

    const sorted = Object.entries(wosData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const embed = new EmbedBuilder()
      .setTitle("🧱 Wall of Shame Leaderboard")
      .setColor(0xff0000)
      .setDescription("Mga mababaho in CebuyaS 😔");

    for (const [userId, score] of sorted) {
      const user = await client.users.fetch(userId).catch(() => null);
      const username = user ? user.username : `Unknown (${userId})`;
      embed.addFields({ name: `${username}`, value: `${score} shame points`, inline: false });
    }

    return message.channel.send({ embeds: [embed] });
  }

  // =============== ⏰ Toggle Reminder: oten!reminder on/off ================
  if (message.content.startsWith(`${PREFIX}reminder`)) {
    const args = message.content.trim().split(/ +/);
    const sub = args[1];

    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply("🚫 Only staff can toggle reminders.");
    }

    if (sub === 'on') {
      reminderState.enabled = true;
      saveReminderState();
      return message.reply('✅ Hourly reminders are now ON.');
    }

    if (sub === 'off') {
      reminderState.enabled = false;
      saveReminderState();
      return message.reply('✅ Hourly reminders are now OFF.');
    }

    return message.reply('Usage: `oten!reminder on` or `oten!reminder off`');
  }

  // =============== 📢 oten!say with title, desc, image ================
  if (message.content.startsWith(`${PREFIX}say`)) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply("🚫 Only staff can use this command.");
    }

    const sayContent = message.content.slice(`${PREFIX}say`.length).trim();

    // Extract channel ID
    const channelMatch = sayContent.match(/\bin\s+(\d{17,20})$/);
    if (!channelMatch) {
      return message.reply("❗ Usage: `oten!say title: Hello | desc: something | img: url | in <channel_id>`");
    }

    const channelId = channelMatch[1];
    const cleanedContent = sayContent.replace(/\s*\|\s*in\s+\d{17,20}$/, '').trim();

    // Parse fields
    const titleMatch = cleanedContent.match(/title:\s*([^|]+)/i);
    const descMatch = cleanedContent.match(/desc:\s*([^|]+)/i);
    const imgMatch = cleanedContent.match(/img:\s*(https?:\/\/\S+)/i);

    const embed = new EmbedBuilder();

    if (titleMatch) embed.setTitle(titleMatch[1].trim());
    if (descMatch) embed.setDescription(descMatch[1].trim());
    if (imgMatch) embed.setImage(imgMatch[1].trim());

    try {
      const targetChannel = await client.channels.fetch(channelId);
      if (!targetChannel || !targetChannel.isTextBased()) {
        return message.reply("❌ Invalid channel ID or the channel is not text-based.");
      }

      await targetChannel.send({ embeds: [embed] });
      return message.reply(`✅ Sent your message to <#${channelId}>`);
    } catch (err) {
      console.error("Error in say command:", err);
      return message.reply("❌ Could not send the message. Check the channel ID and try again.");
    }
  }
});

// =============== ⏰ Hourly Reminder (GMT+8) ================
schedule.scheduleJob('* * * * *', async () => {
  const now = new Date();
  const gmt8 = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const hour = gmt8.getHours();
  const minute = gmt8.getMinutes();

  if (minute === 0 && reminderState.enabled) {
    const hourText = `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'} NA MY DUDES!`;

    const embed = new EmbedBuilder().setTitle(hourText);

    try {
      const channel = await client.channels.fetch(REMINDER_CHANNEL_ID);
      if (channel) {
        channel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error('Error sending time reminder:', err);
    }
  }
});

client.login(TOKEN);