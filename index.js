// Required libraries
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const opusscript = require('opusscript'); // Opus codec for voice support

// Create the client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates, // Needed for voice channels
  ],
});

// Bot token
const TOKEN = process.env.TOKEN;
const PREFIX = 'oten!'; // Custom prefix for your commands
let audioPlayer = null; // To manage the current audio playback

// When the bot is ready
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Message handler
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Auto-response to "oten"
  if (message.content.toLowerCase().includes('oten')) {
    message.channel.send('BELATTTT!');
  }

  // oten!play command
  if (message.content.startsWith(`${PREFIX}play`)) {
    const args = message.content.split(' ');
    const song = args.slice(1).join(' ');

    if (!song) {
      message.channel.send('Please provide a song name or URL.');
      return;
    }

    // Debug: check if user is in voice channel
    console.log(`User ${message.author.tag} is in voice channel: ${message.member.voice.channel ? 'Yes' : 'No'}`);

    // Join the user's voice channel
    if (message.member.voice.channel) {
      const connection = joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      playSong(message, song, connection);
    } else {
      message.channel.send('You need to join a voice channel first!');
    }
  }

  // oten!skip command
  if (message.content.startsWith(`${PREFIX}skip`)) {
    if (audioPlayer) {
      audioPlayer.stop();
      message.channel.send('⏭ Skipped the song!');
    } else {
      message.channel.send('No song is currently playing.');
    }
  }
});

// Function to play the song
async function playSong(message, song, connection) {
  try {
    const stream = ytdl(song, { filter: 'audioonly', quality: 'highestaudio' });

    const resource = createAudioResource(stream);
    audioPlayer = createAudioPlayer();
    audioPlayer.play(resource);

    audioPlayer.on(AudioPlayerStatus.Idle, () => {
      console.log('🔇 Song finished.');
      connection.destroy();
    });

    connection.subscribe(audioPlayer);
    message.channel.send(`🎶 Now playing: ${song}`);
  } catch (error) {
    console.error('Error while playing song:', error);
    message.channel.send('❌ Could not play the song. Make sure the URL is valid.');
  }
}

// Start the bot
client.login(TOKEN);
