# 💌 HeartChat

A private, romantic chat app built just for two people. Only you and your partner can use it.

## Features
- Real-time messaging (instant delivery)
- Send photos and images
- Record and send voice messages
- Message history preserved forever (MongoDB Atlas)
- Romantic dark theme with gold accents
- Only the two of you can log in

## Setup Instructions

### Step 1: Create a MongoDB Atlas Database (Free)

1. Go to https://www.mongodb.com/atlas
2. Sign up for a free account
3. Create a **free cluster** (M0 tier — it's free forever)
4. Click **"Connect"** → **"Connect your application"**
5. Copy the connection string (looks like: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/...`)
6. Replace `<password>` with your database user's password
7. Change `myFirstDatabase` to `heartchat`

### Step 2: Set Your Credentials

Open the `.env` file and fill in your details:

```env
# Your MongoDB connection string (from Step 1)
MONGODB_URI=mongodb+srv://YourUser:YourPassword@cluster0.xxxxx.mongodb.net/heartchat

# You (Person 1)
USER_1_NAME=YourName          # Pick your name
USER_1_PASSWORD=YourPassword  # Pick your password

# Your Partner (Person 2)
USER_2_NAME=PartnerName          # Pick your partner's name
USER_2_PASSWORD=PartnerPassword  # Pick your partner's password
```

### Step 3: Install and Run

```bash
# Install all dependencies
npm install

# Start the app (both server + client)
npm run dev
```

Open **http://localhost:5173** in your browser.

Log in with the name and password you set in `.env`. Your partner does the same with their credentials.

### Deploying to Railway (So You Can Chat Anywhere)

1. Push this code to a **GitHub** repository
2. Go to https://railway.app and sign up
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your repository
5. Go to the **"Variables"** tab and add these exact environment variables:
   - `MONGODB_URI` — paste your MongoDB connection string
   - `USER_1_NAME` — your name
   - `USER_1_PASSWORD` — your password
   - `USER_2_NAME` — partner's name
   - `USER_2_PASSWORD` — partner's password
   - `NODE_ENV` — set to `production`
6. Railway will auto-deploy. Your app will be live at a `*.railway.app` URL

## File Structure

```
heartchat/
├── .env                     # Your secrets (never share this!)
├── package.json             # Project scripts & dependencies
├── railway.json             # Railway deployment config
├── server/
│   ├── index.js             # Main server (auth + real-time messaging)
│   ├── db.js                # MongoDB connection
│   ├── models/
│   │   └── Message.js       # Message data structure
│   ├── routes/
│   │   └── upload.js        # Photo/audio file upload handler
│   └── uploads/             # Uploaded files stored here
├── client/
│   ├── index.html           # HTML page
│   ├── vite.config.js       # Dev server config
│   └── src/
│       ├── main.jsx         # React starting point
│       ├── App.jsx          # Main app (login vs chat switcher)
│       ├── socket.js        # Socket.IO connection helper
│       ├── pages/
│       │   └── ChatPage.jsx # The chat screen
│       ├── components/
│       │   ├── LoginScreen.jsx    # Login with name + password
│       │   ├── MessageBubble.jsx  # Individual message display
│       │   ├── MessageInput.jsx   # Text input + attach buttons
│       │   ├── ImageViewer.jsx    # Full-screen photo viewer
│       │   └── AudioRecorder.jsx  # Voice recording
│       └── styles/
│           └── App.css      # All the love-themed CSS
└── README.md                # This file
```

## Where to Put Your Login Credentials

Open the **`.env`** file in the root folder. You'll see:

```
USER_1_NAME=YourName          ← Change to your name
USER_1_PASSWORD=YourPassword  ← Change to your password
USER_2_NAME=PartnerName       ← Change to partner's name  
USER_2_PASSWORD=PartnerPassword  ← Change to partner's password
```

These are the only two accounts that can log into the chat. Anyone else who tries will be rejected.
