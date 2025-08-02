const { Client, GatewayIntentBits } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus
} = require('@discordjs/voice');
const ytdl = require('ytdl-core');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const PREFIX = 'oten!';
const TOKEN = process.env.TOKEN; // Use Railway environment variable

let audioPlayer = null;

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // BELATTTT! for messages containing "oten"
  if (message.content.toLowerCase().includes('oten')) {
    message.channel.send('BELATTTT!');
  }

  // oten!play [URL]
  if (message.content.startsWith(`${PREFIX}play`)) {
    const args = message.content.split(' ');
    const song = args.slice(1).join(' ');

    if (!song) {
      message.channel.send('❗ Please provide a YouTube URL.');
      return;
    }

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      message.channel.send('❌ You need to join a voice channel first!');
      return;
    }

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
});

client.login(TOKEN);
