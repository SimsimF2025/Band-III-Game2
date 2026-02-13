# 🎓 Band III Vocab Master

An interactive, AI-enhanced memory matching card game designed specifically for students to master the **Band III Core Vocabulary** lists. This application helps students bridge the gap between English terms and their Arabic translations or English definitions through engaging gameplay.

## 🌟 Key Features

-   **Memory Matching Gameplay:** Classic card-matching mechanics to reinforce word associations.
-   **AI-Powered Hints:** Integrates with **Google Gemini AI** to generate context-aware example sentences for any word on the fly.
-   **Dynamic Difficulty:** Choose between Easy (10 words), Medium (15 words), or Hard (20 words) modes.
-   **Multiple Lists:** Support for specialized vocabulary sets (List A, B, C, and D).
-   **Student Progress Tracking:** Capture student names and classes, automatically syncing results to a **Google Sheet**.
-   **Aesthetic UI/UX:** A clean, responsive design built with Tailwind CSS, featuring smooth animations and perspective card flips.
-   **Audio Feedback:** Interactive sound effects for flips, matches, and errors.

## 🛠️ Tech Stack

-   **Frontend:** React (Hooks, Context, Functional Components)
-   **Styling:** Tailwind CSS (Responsive Design)
-   **AI Integration:** `@google/genai` (Gemini 3 Flash)
-   **Backend Sync:** Google Apps Script (Web App URL)
-   **Font:** Inter (English) & Cairo (Arabic)

## 🚀 Getting Started

### Prerequisites
-   A Google Gemini API Key (get one at [ai.google.dev](https://ai.google.dev/))
-   A Google Sheet with a connected Apps Script to receive student data.

### Configuration
1.  **API Key:** Ensure your environment variable `API_KEY` is set for the Gemini integration.
2.  **Sync URL:** Update the `GOOGLE_SHEET_URL` in `App.tsx` with your specific Google Apps Script deployment URL.

## 📦 Deployment

### Standard Web Hosting
Deploy as a standard React single-page application.

### Google Sites (Embed)
If you are embedding this into a Google Site:
1.  Use the "Embed Code" option.
2.  Ensure you use the self-contained `index.html` structure (which bundles the React logic into a single file) to avoid cross-origin module loading issues common in sandboxed iframes.

## 📝 Educational Content Credits
-   **Vocabulary Content:** Based on Band III Core I.
-   **Curated by:** Fouad Nasir.

---
*Built with ❤️ for better learning.*