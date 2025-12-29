Therap Kick-Off | Real-Time Sports Auction System
Therap Kick-Off is a modern, real-time drafting application designed for managing sports team auctions. Built with React, TypeScript, and Firebase, it features a dual-interface system: a "Command Center" for administrators to control the auction flow, and a "Team Hub" for team owners to bid in real-time.
Key Features For Administrators (Command Center)
Player Management: Import, update, and delete players.
Team Management: Register teams and manage initial budgets.
Auction Control: Start bidding for specific players, manage the countdown timer, and finalize sales (Sold/Unsold).
Data Control: Full factory reset capabilities to clear the database.
For Team Owners (Team Hub)
Real-Time Bidding: Instant updates on current bids and highest bidders.
Budget Management: Live tracking of "Purse" (remaining budget).
Squad Tracking: View acquired players and remaining slots.
Validation:
Budget Check: Prevents bidding beyond available funds.
Elite Constraint: Enforces a hard limit of Max 2 Tier-1 players per team.
⚙️ Technical Highlights
Live Sync: Uses Firebase Firestore onSnapshot for millisecond-latency updates across all devices.
Optimistic UI: Local state updates immediately while syncing to the cloud in the background.
Offline Resilience: Persists state to localStorage to handle page refreshes or connection drops.
Responsive Design: Built with Tailwind CSS for a modern "Glassmorphism" aesthetic.
Getting StartedPrerequisites
Node.js (v14 or higher)
npm or yarn
A Google Firebase account
1. Installation
Clone the repository and install dependencies:
Bash
git clone https://github.com/your-username/therap-kickoff.git
cd therap-kickoff
npm install
2. Firebase Configuration (Crucial Step)
The application requires a Firebase backend to function.
Go to the Firebase Console.
Create a new project.
Navigate to Build > Firestore Database and click "Create Database".
Start in Test Mode (allows read/write access).
Go to Project Settings > General and click the </> (Web) icon to register an app.
Copy the firebaseConfig object provided by Google.
Open src/App.tsx and replace the placeholder config:
TypeScript
// src/App.tsx

// REPLACE THIS SECTION
const firebaseConfig = {
  apiKey: "AIzaSy-YOUR_REAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456...:web:..."
};
3. Running the App
Bash
npm start
# or if using Vite
npm run dev
Project Structure
src/
├── components/
│   ├── AdminPanel.tsx      # Admin controls (Import/Edit/Reset)
│   ├── AuctionPanel.tsx    # The live bidding interface/timer
│   └── PlayerCard.tsx      # Visual representation of players
├── types.ts                # TypeScript interfaces (Player, Team, Role)
├── App.tsx                 # Main application logic & State Management
└── index.css               # Tailwind directives
Usage GuideInitial Setup (First Run)
Open the app in your browser.
Select Admin Portal.
Use the Admin Panel to:
Import a list of Teams (assign budgets).
Import a list of Players (assign base prices and tiers).
Note: The app starts empty by default.
Conducting the Auction
The Admin selects a player from the list and clicks "Start Auction".
Team Owners (on their own devices) enter the Team Hub, select their team name, and place bids.
The Admin monitors the timer. When bidding stops, the Admin clicks "SOLD" (assigning the player to the highest bidder) or "UNSOLD".
Resetting
To start a new session, the Admin can click the Factory Reset button in the top navigation bar. Warning: This deletes all data from Firestore.
Business Rules Implemented
The following rules are hard-coded into App.tsx:
Bankruptcy Protection: A team cannot bid Current Bid + Increment if it exceeds their (Total Budget - Spent Budget).
Tier 1 Cap: If a player is marked as TIER_1, a team cannot bid if they already have 2 TIER_1 players in their squad.
Built With
React - UI Library
TypeScript - Type Safety
Tailwind CSS - Styling
Firebase Firestore - Real-time Database
