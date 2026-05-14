
# ⏰ Wakeup Alarm

A powerful, AI-enhanced alarm clock for Android and Web designed to make waking up inevitable. Built with **React**, **Capacitor**, and **TensorFlow.js**, it challenges you to complete tasks—like object detection or math puzzles—before the alarm stops.

![Banner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## 🚀 Features

- **Object Detection Challenges**: Turn off your alarm by showing your camera a specific object (e.g., a "cup", "bottle", or "laptop") powered by TensorFlow.js (COCO-SSD).
- **Math Puzzles**: Engage your brain immediately with customizable math challenges.
- **Native Android Service**: Robust alarm system that works in the background, during Doze mode, and even after device reboots using native Android foreground services.
- **AI Integration**: Powered by Google Gemini for smart interactions and challenge generation.
- **Cross-Platform**: Seamless experience across Web and Android (via Capacitor).
- **Offline Mode**: Local object detection and alarm triggering for reliability without internet.
- **Cloud Sync**: Firebase integration for syncing your alarms and stats across devices.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion
- **Mobile**: Capacitor 8, Native Android (Java/Kotlin)
- **AI/ML**: TensorFlow.js (COCO-SSD), Google Gemini API
- **Backend**: Firebase (Firestore, Auth)
- **Local Storage**: SQLite (via `better-sqlite3`)

## 📦 Installation

### Prerequisites
- Node.js (v18+)
- Android Studio (for Android builds)

### Setup
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd wakeup-alarm
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create a `.env.local` file and add your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. **Run on Web**:
   ```bash
   npm run dev
   ```

### Android Build
1. **Sync Capacitor**:
   ```bash
   npx cap sync
   ```

2. **Open in Android Studio**:
   ```bash
   npx cap open android
   ```

3. **Build APK/Bundle**: Use Android Studio to build and run on your device.

## 📱 Mobile Specifics

This project includes a custom native Android implementation to bypass common background limitations:
- **Foreground Service**: Ensures the alarm sound doesn't get killed by the system.
- **Exact Alarms**: Uses Android's `AlarmManager.setAlarmClock` for down-to-the-second precision.
- **WakeLock**: Prevents the CPU from sleeping while the alarm is ringing.
