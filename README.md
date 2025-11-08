# Kisaan-Mitra

_A collaborative multi-agent AI system that gathers and analyzes weather, soil, and market data to provide personalized, real-time farming advice. The system helps farmers make informed decisions on crop selection and sowing plans, empowering rural communities with intelligent agricultural insights._

---

## 🚀 Overview

Kisaan-Mitra is an AI-driven farming assistant aimed at revolutionizing agriculture for rural communities. By leveraging weather forecasts, soil analytics, and market trends, Kisaan-Mitra tailors actionable advice for every farmer, optimizing crop selection and sowing strategies.

### What does it do?

- **Aggregates Data:** Collects weather, soil condition, and market price data from various sources.
- **Analyzes & Synthesizes:** Applies multi-agent intelligence to process data holistically.
- **Delivers Advice:** Suggests crop choices and sowing plans relevant to the farmer’s location and soil.
- **Empowers Communities:** Bridges information gaps for rural farmers, fostering better yields and sustainable practices.

---

## ⚙️ Installation & Setup

### Prerequisites

- Node.js (v16+ recommended)
- npm
- A Google Gemini API key (see instructions below)

### Steps

1. **Clone the repository:**
    ```bash
    git clone https://github.com/Vikas-k-c/Kisaan-Mitra.git
    cd Kisaan-Mitra
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Create your API key:**  
   The AI features require a Google Gemini API key. You **must create your own key** and set it in a `.env` file at the root of the project:

    ```
    REACT_APP_API_KEY=<your_google_gemini_api_key>
    ```

   > **Note:** Without this key, the UI will work but AI recommendations will not be generated.

4. **Run the application:**
    ```bash
    npm start
    ```

5. **Access the Web Interface:**
    - Open your browser and navigate to `http://localhost:3000` (port will be shown in your terminal after starting).

---

## 🧑‍🌾 How to Use Kisaan-Mitra

After you’ve set up the system:

1. **Open the Web Interface** at the local address shown in your terminal.
2. **Register or Log In:** Start by registering as a user (if authentication is enabled), or use as a guest.
3. **Enter Your Details:**
    - **Farm Location:** Choose or enter your district, village, or pin code.
    - **Soil Data:** Provide soil type, moisture level, or use “Auto-detect” if sensors are connected.
    - **Crop Interests:** Select crops you want advice about (e.g., wheat, rice, maize).
4. **Receive Recommendations:**  
   Kisaan-Mitra will analyze data using its multi-agent engine. You will get:
    - Best crops for your current conditions.
    - Suggested sowing and planting dates.
    - Market pricing trends and advice on when to harvest or sell.
5. **Check Updates:**  
   Advice updates automatically as new data comes in. Refresh or revisit to get fresh insights.
6. **Explore Advanced Features:**
    - Data visualizations (weather charts, soil health maps, market graphs).
    - Export findings or recommendations.
    - Connect your sensors or extension modules for more accurate data.

---

## 📝 Troubleshooting

- If the site doesn’t load, verify Node.js is installed and that you ran `npm install` and `npm start`.
- Ensure the `.env` file contains a valid API key; otherwise, AI recommendations will not work.
- For sensor integration, check the documentation for compatible devices.

---

## 🙋 Need Help?

If you have questions or need support:
- [Open an issue on GitHub](https://github.com/Vikas-k-c/Kisaan-Mitra/issues)
- Check FAQs below.
- Reach out to the project owner.

---

## 🧠 Features

- **Multi-Agent AI System**  
  Agents focus on weather, soil, and market data and collaborate to produce recommendations.
- **Personalized & Real-Time**  
  Advice is customized per user and updated continuously.
- **Integrated Data Sources**  
  Fetches reliable data from open APIs and local sensors.
- **User-Friendly Interface**  
  Designed for intuitive use by farmers and agriculture professionals.
- **Modular Architecture**  
  Easily extendable to include more data sources or agents.

---

## 🏆 Tech Stack

- **TypeScript** – Primary language for application logic and agents.  
- **HTML** – User interface scaffolding.

---

## 🏛️ Architecture

+-------------------+    +------------------+    +------------------+
|   Weather Agent   |    |   Soil Agent     |    |   Market Agent   |
+-------------------+    +------------------+    +------------------+
          \                  |                    /
           \                 |                   /
            \                |                  /
             \               |                 /
              +---------------------------------+
              |    Recommendation Engine        |
              |  (Synthesizes agent outputs)   |
              +---------------------------------+
                               |
                               v
                       +-------------------+
                       |   User Interface  |
                       |  (Web/React App)  |
                       +-------------------+


---

## 📝 Contributing

We welcome contributions! Please:

1. **Fork** the repo and create a branch.  
2. **Add your changes**—preferably in TypeScript for core logic.  
3. **Test changes locally**.  
4. **Open a pull request** describing your updates.

---

## 🙋 FAQ

**Q:** Who is this for?  
_A:_ Rural farmers, extension officers, agtech developers.

**Q:** How can I localize for my region?  
_A:_ The system is modular; translation and local data source support are planned.

**Q:** Can I add my own sensor or agent?  
_A:_ Yes. Follow the code conventions in the `agents` directory.

**Q:** Do I need to be technical?  
_A:_ No. UI is designed for non-technical users.

---

## 🏆 Acknowledgements

- Inspired by the vision to empower rural communities through technology.  
- Created by Vikas-k-c and contributors.

---

> _Kisaan-Mitra strives to enable rural prosperity through intelligent methods. Users need to generate their own API key to fully experience AI recommendations._
