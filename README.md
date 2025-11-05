# 🎵 Music Guesser

A fun web app where you guess songs or artists from 10-second audio clips - like a mini-Heardle clone!

## Features

- 🎧 **Guess the Song Mode**: Listen to a 10-second clip and guess the song name
- 🎤 **Guess the Artist Mode**: Listen to a 10-second clip and guess the artist
- 🎯 **Score Tracking**: Keep track of your correct guesses
- 🎨 **Beautiful UI**: Modern, gradient-based design with smooth animations
- 🆓 **Free to Use**: Uses Spotify's free Web API

## Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Spotify API Setup (Optional)

The app can work in demo mode without Spotify credentials, but for the full experience:

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Get your **Client ID** and **Client Secret**
4. Create a `.env` file in the root directory:
   ```
   VITE_SPOTIFY_CLIENT_ID=your_client_id_here
   VITE_SPOTIFY_CLIENT_SECRET=your_client_secret_here
   ```

### Running the App

```bash
 npm run dev
```

The app will open at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

## How It Works

1. Choose a game mode (Guess the Song or Guess the Artist)
2. Click "Play 10s Clip" to hear the audio preview
3. Type your guess in the input field
4. Submit your answer
5. See if you're correct and view your score!

## Notes

- The app uses Spotify's preview URLs (30-second clips), but limits playback to 10 seconds
- Some tracks may not have preview URLs available
- The app filters out tracks without previews automatically
- For production use, you may want to implement OAuth flow for better API access

## Technologies

- React 18
- Vite
- Spotify Web API
- Modern CSS with gradients and animations

## License

MIT

