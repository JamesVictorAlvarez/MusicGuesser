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

## Playing Online with Friends (Free)

To play with friends online without paying, you have several free options:

### Option 1: ngrok Backend + Vercel Frontend (Recommended - Simplest)

This is the easiest permanent solution: use ngrok for your backend (runs locally) and deploy the frontend to Vercel (free, permanent URL).

**Setup Steps:**

1. **Start your backend server:**
   ```bash
   npm run server
   ```

2. **In a new terminal, start ngrok for the backend:**
   ```bash
   ngrok http 3001
   ```

3. **Copy the HTTPS URL** from ngrok (e.g., `https://abc123.ngrok.io`)

4. **Create a `.env` file** in the root directory:
   ```
   VITE_SERVER_URL=https://abc123.ngrok.io
   ```
   (Replace with your actual ngrok URL)

5. **Deploy frontend to Vercel:**
   - Go to [vercel.com](https://vercel.com) and sign up (free)
   - Click "Add New Project" → Import your GitHub repository
   - Configure:
     - **Framework Preset**: Vite
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
   - Add environment variable:
     - `VITE_SERVER_URL` = your ngrok backend URL
   - Click "Deploy"
   - Share the Vercel URL with your friends!

**Important Notes:**
- Your ngrok URL changes each time you restart ngrok. When it changes:
  - Update the `VITE_SERVER_URL` environment variable in Vercel (Settings → Environment Variables)
  - Redeploy the frontend (click "Redeploy" in Vercel dashboard)
- **Keep ngrok running** - if you close the ngrok terminal, your friends won't be able to connect
- **If you get "Cannot connect to server" error:**
  1. Make sure `npm run server` is running
  2. Make sure ngrok is running (`ngrok http 3001`)
  3. Check that Vercel has the correct `VITE_SERVER_URL` environment variable
  4. Redeploy on Vercel after updating the environment variable

### Option 2: Using ngrok for Both (Quick Testing - 5 minutes)

This is the fastest way to play online right now. You'll need to tunnel both the frontend and backend.

1. Download ngrok from [ngrok.com](https://ngrok.com/download) (free, requires signup)
2. Start your server locally:
   ```bash
   npm run server
   ```
3. In a new terminal, create a tunnel for the backend:
   ```bash
   ngrok http 3001
   ```
4. Copy the HTTPS URL shown (e.g., `https://abc123.ngrok.io`)
5. Create a `.env` file in the root directory:
   ```
   VITE_SERVER_URL=https://abc123.ngrok.io
   ```
6. Start the client:
   ```bash
   npm run dev
   ```
7. In another terminal, create a tunnel for the frontend:
   ```bash
   ngrok http 3000
   ```
8. Copy the frontend HTTPS URL (e.g., `https://xyz789.ngrok.io`)
9. Share the frontend ngrok URL with your friends

**Note:** Free ngrok URLs change each time you restart. You'll need to update the `.env` file and share the new frontend URL each time. For a permanent solution, see Option 2 below.

### Option 2: Deploy to Free Hosting Services (Permanent Solution)

For a permanent solution that doesn't require restarting tunnels, deploy both frontend and backend to free hosting services.

#### Deploy Backend (Server) to Render (Free Tier)

1. Go to [render.com](https://render.com) and sign up (free)
2. Create a new "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `music-guesser-server` (or any name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
5. Add environment variable:
   - `PORT` = `3001` (Render will auto-assign, but set this for consistency)
6. Click "Create Web Service" and wait for deployment
7. Copy the service URL (e.g., `https://music-guesser-server.onrender.com`)

**Note:** Free Render services spin down after 15 minutes of inactivity. The first request may take 30-60 seconds to wake up.

#### Deploy Frontend to Vercel (Free)

1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Click "Add New Project" and import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variable:
   - `VITE_SERVER_URL` = your Render backend URL (e.g., `https://music-guesser-server.onrender.com`)
5. Click "Deploy"
6. Once deployed, share the Vercel URL with your friends (e.g., `https://music-guesser.vercel.app`)

#### Alternative: Deploy Both to Render

You can also deploy both frontend and backend to Render:

**Backend:** Follow steps above for Render Web Service

**Frontend:**
1. On Render, create a new "Static Site"
2. Connect your repository
3. Configure:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Add environment variable:
   - `VITE_SERVER_URL` = your Render backend URL
5. Deploy and share the URL

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