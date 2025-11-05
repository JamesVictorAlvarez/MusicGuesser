# Testing Multiplayer Guide

## Prerequisites

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Make sure you have Spotify API credentials** in your `.env` file:
   ```
   VITE_SPOTIFY_CLIENT_ID=your_client_id
   VITE_SPOTIFY_CLIENT_SECRET=your_client_secret
   ```

## Starting the Server

1. **Open a terminal** and run the server:
   ```bash
   npm run server
   ```
   
   You should see:
   ```
   Server running on port 3001
   ```

2. **Keep this terminal open** - the server needs to keep running.

## Starting the Client

1. **Open a NEW terminal** (keep the server running in the first one)

2. **Start the client**:
   ```bash
   npm run dev
   ```

3. **Open your browser** to the URL shown (usually `http://localhost:3000`)

## Testing Multiplayer

### Test 1: Single Player (Basic Connection Test)

1. Open the app in your browser
2. Click "Play Multiplayer"
3. You should see:
   - ✅ A connection status message (should show "Connecting..." then disappear when connected)
   - ✅ "Create Room" and "Join Room" options
   - ✅ If you see a red error message, the server isn't running

### Test 2: Create and Join Room (Single Browser)

1. In the multiplayer menu:
   - Enter your name (e.g., "Player1")
   - Click "Create Room"
   - You should see a room code appear (e.g., "ABC123")
   - You should be taken to the lobby

2. **In the lobby:**
   - You should see your name in the players list
   - You should see a "Ready" button
   - Click "Ready"
   - You should see "✓ Ready" next to your name

### Test 3: Multi-Browser Testing (Recommended)

To test multiplayer properly, you need **at least 2 browser windows/tabs**:

#### Window 1 (Host):
1. Open `http://localhost:3000` in your browser
2. Click "Play Multiplayer"
3. Enter name: "Host"
4. Click "Create Room"
5. **Copy the room code** (e.g., "ABC123")
6. Click "Ready" in the lobby

#### Window 2 (Player 2):
1. Open `http://localhost:3000` in a **new tab or different browser**
2. Click "Play Multiplayer"
3. Enter name: "Player2"
4. **Paste the room code** from Window 1
5. Click "Join Room"
6. You should see both players in the lobby
7. Click "Ready" in Window 2

#### Starting the Game:
- Once both players are ready, the game should start automatically
- Both windows should see the same round starting
- Both players should hear the same song

### Test 4: Full Game Flow

1. Play through a round:
   - Wait 5 seconds for the song to auto-start
   - Select an answer
   - Both players' answers should be recorded
   - After 2 seconds, the next round should start

2. Continue until round 10:
   - The game should show "Round X/10" in the header
   - After round 10, you should see the final leaderboard
   - The player with the highest score wins

## Troubleshooting

### Problem: "Cannot connect to server"
- **Solution**: Make sure the server is running (`npm run server` in a separate terminal)

### Problem: "Socket.io not available"
- **Solution**: Run `npm install` to ensure all dependencies are installed

### Problem: Multiplayer menu shows but nothing happens when clicking buttons
- **Solution**: 
  1. Check the browser console (F12) for errors
  2. Make sure the server is running and shows "Server running on port 3001"
  3. Check if you see "Socket connected" in the browser console

### Problem: Can't see other players in lobby
- **Solution**:
  1. Make sure both players are using the same room code
  2. Check the server terminal for connection messages
  3. Refresh both browser windows and try again

### Problem: Game doesn't start after all players ready
- **Solution**:
  1. Check browser console for errors
  2. Make sure tracks are loaded (check for "No tracks available" error)
  3. Make sure Spotify API credentials are set

## Debugging Tips

1. **Browser Console** (F12):
   - Look for "Socket connected" message
   - Check for any red error messages
   - Look for "Room created", "Room joined", etc. messages

2. **Server Terminal**:
   - Should show "Player connected: [socket-id]" when players join
   - Should show room creation/joining messages

3. **Network Tab** (F12 → Network):
   - You should see WebSocket connections to `ws://localhost:3001`

## Expected Console Messages

When everything works, you should see in the browser console:
```
Connecting to socket server...
Socket connected: [some-id]
Room created: { roomId: "ABC123" }
Room updated: { players: [...], ... }
Game started
Load round: { round: 1 }
Round started: { track: {...}, options: [...], ... }
```

## Quick Test Checklist

- [ ] Server starts without errors
- [ ] Client connects to server (check console)
- [ ] Can create a room
- [ ] Can join a room (in another browser/tab)
- [ ] Can see other players in lobby
- [ ] Can click "Ready"
- [ ] Game starts when all players ready
- [ ] Songs play for all players
- [ ] Answers are submitted
- [ ] Scores update correctly
- [ ] Game ends after 10 rounds
- [ ] Leaderboard displays correctly

