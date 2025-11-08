# Music Guesser

A fun web app where you guess songs or artists from 10-second audio clips - like a mini-Heardle clone!

## Features

- **Guess the Song Mode**: Listen to a 10-second clip and guess the song name
- **Guess the Artist Mode**: Listen to a 10-second clip and guess the artist
- **Score Tracking**: Keep track of your correct guesses
- **Multiplayer Mode**: Play with friends in real-time multiplayer games
- **Beautiful UI**: Modern, gradient-based design with smooth animations
- **Free to Use**: Uses iTunes API for track data and previews

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

Spotify API integration is included in the codebase but is not actively used. The app primarily uses the iTunes API for track data and preview URLs. If you want to enable Spotify support in the future:

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Get your **Client ID** and **Client Secret**
4. Create a `.env` file in the root directory:
   ```
   VITE_SPOTIFY_CLIENT_ID=your_client_id_here
   VITE_SPOTIFY_CLIENT_SECRET=your_client_secret_here
   ```

### Running the App

### Single Player Mode
```bash
npm run dev
```
The app will open at `http://localhost:3000`

### Multiplayer Mode
1. Start the server:
   ```bash
   npm run server
   ```
   The server will run on `http://localhost:3001`

2. In another terminal, start the client:
   ```bash
   npm run dev
   ```

3. Open multiple browser windows/tabs to test multiplayer locally, or share the room code with friends on the same network

### Building for Production

```bash
npm run build
```

## How It Works

1. Choose a game mode (Guess the Song or Guess the Artist)
2. Listen to the 10-second audio preview
3. Select your answer from the multiple choice options
4. Submit your answer
5. See if you're correct and view your score!

## Notes

- The app uses iTunes API for track data and preview URLs
- Some tracks may not have preview URLs available
- The app filters out tracks without previews automatically
- Spotify API code is present but not actively used - the app falls back to iTunes API

## Technologies

- React 18
- Vite
- Socket.io (for multiplayer)
- Express (for server)
- iTunes API (primary track source)
- Spotify Web API (included but not actively used)