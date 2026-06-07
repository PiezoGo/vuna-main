# Vuna B2B Agricultural Marketplace

A peer-to-peer B2B platform connecting Kenyan farmers and buyers directly.

---

## Getting Started

### Backend (Django API)

```bash
cd vuna-main/backend
pip install -r requirements.txt   # install Python deps (if requirements.txt available)
python manage.py migrate
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`

### Frontend (React + Vite)

```bash
cd vuna-main/frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

---

## Features

- Farmer and Buyer role-based dashboards
- Product listing, marketplace browsing, order management
- Real-time chat messaging
- **Help navigation guide** (floating ? button or navbar Help button)
- **Profile editing** (avatar, bio, name, email, city, market)
- **Audio & Video Calling** (WebRTC via PeerJS — see below)

---

## Audio/Video Calling Feature

### Technology Used

- **[PeerJS](https://peerjs.com/)**: A free, lightweight WebRTC wrapper.
- **Signaling**: PeerJS public cloud (`peerjs.com`) handles signaling automatically — no backend server required.
- Each logged-in user is registered on PeerJS using their UUID (dashes stripped for PeerJS compatibility).

### How to Test (Two-User Demo)

1. Open the app in **two separate browser windows or incognito tabs**.
2. **Log in as different users** (e.g., a Farmer in Tab 1 and a Buyer in Tab 2).
3. To start a call, use any of these:
   - Go to **Marketplace (Buyer)** → Click the green 📹 button on a product listing.
   - Go to **My Orders (Buyer / Farmer)** → Click the green 📹 **Call** button next to an order.
   - Open a **Chat** conversation → Click the 📹 icon in the top-right corner of the chat header.
4. The **receiving user** will see an **"Incoming Call" toast** appear in the top-right of the screen.
5. Click **Accept** — both users will be prompted for camera/microphone permissions.
6. The **video call overlay** opens with:
   - 🖥️ Remote video (full screen)
   - 📷 Local video (picture-in-picture, top-right)
   - 🎙️ Mute/Unmute microphone
   - 📹 Toggle camera on/off
   - 📵 End call (releases all tracks)

### Notes

- Calls work across different browsers on the same machine (Tab 1 = Chrome, Tab 2 = Incognito Chrome, or Firefox).
- For cross-device calls on the same network, both devices must be accessible. PeerJS uses STUN/TURN servers for NAT traversal automatically.
- **Only one active call at a time** per user. Incoming calls are auto-declined if a call is already in progress.
- Camera/microphone tracks are fully released (green light turns off) when a call ends.

### Replacing the PeerJS Signaling Server (for Production)

To switch from the public PeerJS cloud to your own signaling server:

```js
// In Navbar.jsx — replace the Peer constructor:
const newPeer = new Peer(user.uid.replace(/-/g, ''), {
  host: 'your-peerserver.com',   // <-- your server domain
  secure: true,
  port: 443,
  path: '/peerjs'                // <-- your server path
});
```

You can self-host a PeerServer with:
```bash
npm install -g peer
peerjs --port 9000
```

---

## Branch Info

All features described above are implemented on the **`help-branch`** Git branch.

Commits:
1. `feat: implement navigation help overlay and profile editing functionality`
2. `feat: add user-to-user audio/video calling via WebRTC (PeerJS)`
