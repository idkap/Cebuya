const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus
} = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const fs = require('fs');
const schedule = require('node-schedule'); // <== Added here

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
const REMINDER_CHANNEL_ID = '1371269267311296584'; // 🔁 Replace with actual channel ID

let audioPlayer = null;

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// =============== 💬 MESSAGE EVENTS ================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // BELATTTT! if message includes "oten"
  if (message.content.toLowerCase().includes('oten')) {
    message.channel.send('BELATTTT!');
  }

  // oten!play [url]
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

  // oten!skip
  if (message.content.startsWith(`${PREFIX}skip`)) {
    if (audioPlayer) {
      audioPlayer.stop();
      message.channel.send('⏭️ Skipped the song!');
    } else {
      message.channel.send('❌ No song is currently playing.');
    }
  }

  // =============== 🧱 WALL OF SHAME ================
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

    // oten!wos score @user 50
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

    // oten!wos — show leaderboard
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
});

// =============== ⏰ HOURLY REMINDER (GMT+8) ================
schedule.scheduleJob('* * * * *', async () => {
  const now = new Date();
  const gmt8 = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const hour = gmt8.getHours();
  const minute = gmt8.getMinutes();

  if (minute === 0) {
    const hourText = `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'} NA MY DUDES!`;

    const embed = new EmbedBuilder()
      .setTitle(hourText)
      .setColor(0x00aeff)
      .setFooter({ text: `GMT+8 Time Reminder` })
      .setTimestamp();

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