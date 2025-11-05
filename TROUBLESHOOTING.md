# Troubleshooting "No tracks available" Error

## Quick Checks

### 1. Check if .env file exists and is correct
- Make sure `.env` is in the **root directory** (same level as `package.json`)
- The file should contain:
  ```
  VITE_SPOTIFY_CLIENT_ID=your_actual_client_id_here
  VITE_SPOTIFY_CLIENT_SECRET=your_actual_client_secret_here
  ```
- **Important**: Variable names MUST start with `VITE_` for Vite to expose them
- No quotes around the values
- No spaces around the `=` sign

### 2. Restart the dev server
After creating/updating `.env`:
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### 3. Check browser console
Open browser DevTools (F12) and look for:
- ✅ "Successfully obtained Spotify access token" - Credentials working!
- ❌ "Spotify credentials not set" - .env file not loading
- ❌ "Spotify API error: 401" - Invalid credentials
- ❌ "Spotify API error: 400" - Malformed request

### 4. Verify your Spotify credentials
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click on your app
3. Verify the Client ID and Client Secret match what's in your `.env` file
4. Make sure you clicked "Show" to reveal the Client Secret (it's hidden by default)

### 5. Test API connection manually
You can test if your credentials work using curl (in terminal):

```bash
curl -X POST "https://accounts.spotify.com/api/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Basic $(echo -n 'YOUR_CLIENT_ID:YOUR_CLIENT_SECRET' | base64)" \
  -d "grant_type=client_credentials"
```

If this returns an `access_token`, your credentials are correct.

## Common Issues

### Issue: "Client ID exists: false"
**Solution**: 
- Check that `.env` file exists in root directory
- Verify variable names start with `VITE_`
- Restart dev server

### Issue: "401 Unauthorized"
**Solution**:
- Double-check Client ID and Client Secret are correct
- Make sure there are no extra spaces or quotes
- Regenerate Client Secret in Spotify Dashboard if needed

### Issue: Tracks load but none have preview URLs
**Solution**:
- This is normal - not all tracks have previews
- The app tries multiple search strategies automatically
- Try again, different searches may yield tracks with previews
- Preview availability varies by region and track

### Issue: CORS errors in console
**Solution**:
- Spotify API should support CORS, but if you see CORS errors:
- This might be a browser security issue
- Try a different browser
- Check if you're using HTTPS (required for some APIs)

## Still Not Working?

1. **Check console logs** - The app now logs detailed information
2. **Verify .env file location** - Must be in root, not in `src/`
3. **Try mock mode** - Remove credentials temporarily to see if app works with mock data
4. **Check network tab** - In DevTools, see if requests are being made and what responses you get

## Getting Help

If you're still stuck, check the browser console and share:
- Any error messages
- The console logs showing what's happening
- Whether you see "Successfully obtained Spotify access token" or not

