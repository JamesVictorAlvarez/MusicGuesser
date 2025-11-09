# Deployment Guide: Vercel + DigitalOcean

This guide covers deploying Music Guesser with the frontend on Vercel and the FastAPI server on DigitalOcean.

## Architecture Overview

```
┌─────────────────────┐
│   Vercel Frontend   │
│  music-guesser.app  │
│    (React + Vite)   │
└──────────┬──────────┘
           │ HTTPS
           │ Socket.IO
           ↓
┌─────────────────────────────────┐
│ DigitalOcean App Platform       │
│ music-guesser-server.ondigitalocean.app
│    (FastAPI + Socket.IO)        │
└─────────────────────────────────┘
```

## Prerequisites

- GitHub account with your forked/cloned repo
- Vercel account (free tier works)
- DigitalOcean account with valid payment method
- `doctl` CLI (DigitalOcean CLI) installed locally

## Part 1: Deploy FastAPI Server to DigitalOcean

### Step 1: Prepare your GitHub repo

Ensure your repository is pushed to GitHub:

```bash
git remote -v  # Verify origin points to your GitHub repo
git push origin main  # Push all changes
```

### Step 2: Update app.yaml with your details

Edit `app.yaml` in the project root:

```yaml
services:
- name: server
  github:
    repo: YOUR_USERNAME/MusicGuesser  # Change this
    branch: main
  # ... rest of config
  envs:
  # ... 
  - key: CORS_ORIGINS
    value: "https://your-frontend.vercel.app"  # Change this
```

Replace:
- `YOUR_USERNAME` with your GitHub username
- `https://your-frontend.vercel.app` with your actual Vercel frontend URL (you'll get this in Part 2)

### Step 3: Deploy with DigitalOcean CLI

**Install doctl (if not already installed):**
```bash
# macOS
brew install doctl

# Linux
cd ~
wget https://github.com/digitalocean/doctl/releases/download/v1.98.0/doctl-1.98.0-linux-x64.tar.gz
tar xf ~/doctl-1.98.0-linux-x64.tar.gz
sudo mv ~/doctl /usr/local/bin
```

**Authenticate with DigitalOcean:**
```bash
doctl auth init
# Follow prompts to enter your API token from DigitalOcean dashboard
```

**Deploy the app:**
```bash
cd /Users/rv/repos/MusicGuesser
doctl apps create --spec app.yaml
```

Save the returned App ID (you'll need it for updates).

**Get your server URL:**
```bash
doctl apps list
# Look for the Default Ingress URL
# It will be something like: https://music-guesser-server-xxxxx.ondigitalocean.app
```

### Step 4: Verify deployment

Test the server is running:

```bash
# Replace with your actual server URL
curl https://music-guesser-server-xxxxx.ondigitalocean.app/

# Check Socket.IO is working
curl https://music-guesser-server-xxxxx.ondigitalocean.app/socket.io/?EIO=4&transport=polling
```

You should see responses (not 404 errors).

## Part 2: Deploy Frontend to Vercel

### Step 1: Connect Vercel to GitHub

1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Select "Import Git Repository"
4. Authorize GitHub and select your MusicGuesser repo
5. Click "Import"

### Step 2: Configure Environment Variables

In Vercel dashboard:

1. Go to Settings → Environment Variables
2. Add new variable:
   - Name: `VITE_SERVER_URL`
   - Value: `https://music-guesser-server-xxxxx.ondigitalocean.app` (your server URL from Part 1)
3. Click "Save"

### Step 3: Deploy

Click "Deploy" in Vercel dashboard. It will automatically:
- Build the frontend (`npm run build`)
- Deploy to Vercel's CDN
- Give you a live URL: `https://your-project.vercel.app`

### Step 4: Update Server CORS

Now go back to DigitalOcean and update the server's CORS origins:

```bash
# Get your app ID
doctl apps list

# Update the app with new CORS origins
doctl apps update YOUR_APP_ID \
  --spec app.yaml \
  --update-env PORT=8000 \
  --update-env CORS_ORIGINS="https://your-project.vercel.app"
```

Or manually edit in DigitalOcean dashboard:
1. Go to your App
2. Settings → Environment
3. Edit `CORS_ORIGINS` with your Vercel URL
4. Save and trigger a redeploy

## Part 3: Testing Production Deployment

### Test API connectivity

```bash
# From your local machine
curl https://music-guesser-server-xxxxx.ondigitalocean.app/

# Should return a response (not 404)
```

### Test Socket.IO connection

Open your Vercel frontend URL in a browser:
- https://your-project.vercel.app

Open browser DevTools (F12) → Console. You should see:
```
Initializing socket connection to: https://music-guesser-server-xxxxx.ondigitalocean.app
```

No CORS errors should appear.

### Test multiplayer game

1. Open frontend in two browser windows
2. Create a room in one browser
3. Join the room in another browser
4. Play through a full game

## Updating Production

### Update Server Code

Push changes to GitHub:

```bash
git add .
git commit -m "your message"
git push origin main
```

DigitalOcean will automatically redeploy (if auto-deploy is enabled).

Or manually trigger:
```bash
doctl apps update YOUR_APP_ID --spec app.yaml
```

### Update Frontend Code

Push changes to GitHub:

```bash
git add .
git commit -m "your message"
git push origin main
```

Vercel will automatically redeploy on GitHub push.

## Environment Variables Reference

### Server (DigitalOcean)
```
PORT=8000                  # Must be 8000 for DigitalOcean
HOST=0.0.0.0             # Accept all interfaces
DEBUG=False              # Disable debug mode in production
CORS_ORIGINS=https://your-frontend.vercel.app
```

### Frontend (Vercel)
```
VITE_SERVER_URL=https://music-guesser-server-xxxxx.ondigitalocean.app
```

## Troubleshooting

### CORS Errors in Browser Console

**Error:** `http://localhost:3000 is not an accepted origin`

**Solution:**
1. Verify `CORS_ORIGINS` in server environment
2. Ensure it matches your Vercel URL exactly
3. Redeploy server after updating

```bash
doctl apps update YOUR_APP_ID --spec app.yaml
```

### Socket.IO connection fails (ERR_CONNECTION_REFUSED)

**Likely causes:**
1. Server URL in `VITE_SERVER_URL` is wrong
2. Server is down or not responding
3. Firewall/network issue

**Debug:**
```bash
# Test server is responding
curl https://music-guesser-server-xxxxx.ondigitalocean.app/

# Check logs in DigitalOcean dashboard
# App → Logs
```

### Socket.IO 403 Forbidden

**Error:** `connection rejected (403 Forbidden)`

**Solution:**
1. Check `CORS_ORIGINS` environment variable
2. Ensure it includes your Vercel domain
3. Redeploy server

### Game state not syncing between players

**Likely cause:** Using old server URL in frontend

**Solution:**
1. Check `VITE_SERVER_URL` in Vercel environment
2. Clear browser cache and localStorage
3. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

## Monitoring & Logs

### View Server Logs

```bash
doctl apps logs YOUR_APP_ID --type run
```

Or in DigitalOcean dashboard:
- App → Logs → Runtime

### View Deployment Logs

```bash
doctl apps logs YOUR_APP_ID --type build
```

Or in DigitalOcean dashboard:
- App → Logs → Build

### Monitor Performance

DigitalOcean dashboard shows:
- CPU usage
- Memory usage
- Request count
- Error rates

If consistently hitting limits, upgrade instance size:
```bash
# Edit app.yaml
instance_size_slug: basic-sm  # More resources
```

## Cost Estimates

### DigitalOcean App Platform
- **basic-xs**: $5/month (512 MB RAM, 1 CPU)
- **basic-s**: $12/month (1 GB RAM, 1 CPU)
- HTTP/HTTPS included
- Auto-scaling available

### Vercel
- **Free tier**: 0-100 concurrent builds, perfect for this project
- **Pro**: $20/month for more features (not needed for this)

**Total estimated cost: $5-12/month**

## Scaling (Future)

If you need to handle more concurrent players:

1. **Increase server resources:**
   ```bash
   # In app.yaml
   instance_size_slug: basic-s  # More powerful
   instance_count: 2            # Multiple instances
   ```

2. **Add Redis for shared state:**
   - DigitalOcean Redis Cluster
   - Modify `state_manager.py` to use Redis

3. **Use DigitalOcean Kubernetes:**
   - For very high scale
   - Auto-scaling based on load

## Security Best Practices

1. **Never commit secrets:**
   - Use environment variables for secrets
   - Keep `.env` out of git (add to `.gitignore`)

2. **HTTPS only:**
   - DigitalOcean enforces HTTPS
   - Update frontend `VITE_SERVER_URL` to use `https://`

3. **Environment secrets:**
   - Use DigitalOcean dashboard for sensitive env vars
   - Don't commit to git

4. **Rate limiting:**
   - Consider adding rate limiting to Socket.IO
   - Prevent abuse of multiplayer API

## Rollback

If deployment breaks, rollback to previous version:

```bash
# Get app history
doctl apps list

# Redeploy specific version (if DigitalOcean kept it)
# Or push previous commit to trigger rebuild
git revert HEAD
git push origin main
```

## Support & Resources

- DigitalOcean Docs: https://docs.digitalocean.com/products/app-platform/
- Vercel Docs: https://vercel.com/docs
- FastAPI Docs: https://fastapi.tiangolo.com/
- Socket.IO: https://socket.io/docs/

## Next Steps

1. Deploy server to DigitalOcean
2. Deploy frontend to Vercel
3. Test multiplayer gameplay
4. Monitor logs for errors
5. Celebrate 🎉

