# 🎲 Cross-Platform Scrabble Game

A full-featured Scrabble game built with **Next.js 14**, **React 18**, **Tailwind CSS**, and **Socket.io**. Supports **Single-Player (vs AI Bots)**, **Worldwide Online Multiplayer**, and **Local Pass & Play**, featuring a dedicated **Time Section** on the screen.

---

## 🌟 Key Features

### 1. ⏱️ Prominent Time Section (On-Screen Timer)
- **Turn Countdown**: Large, high-visibility timer (`MM:SS`) with dynamic color urgency:
  - 🟢 **Safe (>50% remaining)**: Calm emerald display.
  - 🟡 **Warning (20%–50%)**: Amber caution.
  - 🔴 **Danger (<20%)**: Flashing red warning with visual pulse.
- **Dynamic Progress Bar**: Smooth linear indicator depleting in real-time.
- **Chess-Style Player Clocks**: Total match game time tracked independently for each player, highlighting whoever is currently active.
- **Time Presets**:
  - **⚡ Blitz**: 90 seconds per turn (15 min game clock)
  - **⏱️ Rapid**: 3 minutes per turn (25 min game clock)
  - **⏳ Standard**: 5 minutes per turn (45 min game clock)
  - **🌴 Relaxed**: 10 minutes per turn (unlimited game clock)

---

### 2. 🤖 Single-Player Mode (vs AI)
- **3 Bot Difficulty Levels**:
  - **🌱 Novice (Easy)**: Plays shorter common words, relaxed placement.
  - **⚔️ Master (Medium)**: Utilizes bonus squares (`DL`, `TL`, `DW`, `TW`) and balanced rack management.
  - **🧠 Grandmaster (Hard)**: Finds high-scoring combinations, plays bingos, and searches strategic board anchors.
- **Offline-First Dictionary**: Pre-loaded with official 2-letter words and thousands of standard Scrabble words.

---

### 3. 🌍 Worldwide Online Multiplayer
- **Real-Time Matchmaking**: Global queue matching players based on ELO ratings.
- **Private Match Lobbies**: Create or join custom matches with shareable 6-digit room codes (e.g. `SCR-8491`).
- **Real-Time Synchronization**: Authoritative server handling board moves, player turns, and clock synchronization via WebSockets (`server/index.ts`).
- **Pass & Play**: Local 2-player mode on the same device.

---

### 4. 🔠 Board & Tile Rules
- **Official 15x15 Grid**: Exact premium multipliers:
  - `TW`: Triple Word (8 squares)
  - `DW`: Double Word (16 squares, including Center Star ★)
  - `TL`: Triple Letter (12 squares)
  - `DL`: Double Letter (24 squares)
- **Standard 100-Tile Bag**: Points and counts matching official Scrabble specs.
- **Wildcard Blank Tiles**: Built-in letter selector modal allowing you to assign any letter (`A`–`Z`) upon placement.
- **Bingo Bonus**: `+50` points when playing all 7 tiles in a single turn.

---

## 🚀 How to Run the Game

### 1. Start Both Game UI & Multiplayer Server (Recommended)
```bash
npm run dev:all
```
- Web Application: **http://localhost:3000**
- Real-Time Multiplayer Server: **ws://localhost:3001**

### 2. Run Only Frontend (Single-Player / Pass & Play)
```bash
npm run dev
```
Open **http://localhost:3000** in your browser.

### 3. Run Production Build
```bash
npm run build
npm start
```

