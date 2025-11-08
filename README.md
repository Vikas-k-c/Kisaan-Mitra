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

3. **Run the application:**
    ```bash
    npm start
    ```

4. **Access the Web Interface:**
    - Open your browser and navigate to `http://localhost:XXXX` (port will be shown in your terminal after starting).

---

## 🧑‍🌾 How to Use Kisaan-Mitra

After you’ve set up the system:

1. **Open the Web Interface:**  
   Visit the local address shown in your terminal (e.g., http://localhost:3000).

2. **Register or Log In:**  
   Start by registering as a user (if authentication is enabled), or just begin as a guest if supported.

3. **Enter Your Details:**
    - **Farm Location:** Choose or enter your district, village, or pin code.
    - **Soil Data:** If you have it, provide soil type, moisture level, or use “Auto-detect” if you have sensors connected.
    - **Crop Interests:** Select crops you want advice about (e.g., wheat, rice, maize).

4. **Receive Recommendations:**  
   Kisaan-Mitra will analyze weather, soil, and market data using its multi-agent engine. You will get:
    - Best crops for your current conditions.
    - Suggested sowing and planting dates.
    - Market pricing trends and advice on when to harvest or sell.

5. **Check Updates:**  
   The advice updates automatically as new data comes in. Refresh or revisit to get fresh insights as conditions change.

6. **Explore Advanced Features:**
    - View data visualizations (weather charts, soil health maps, market graphs).
    - Export findings or recommendations.
    - Connect your sensors or extension modules for more accurate data.

### Example User Flow

- Ramesh, a farmer in Uttar Pradesh, enters soil type (“Loamy”), location (“Mathura”), and crop (“Mustard”).
- Kisaan-Mitra suggests sowing Mustard between October 15–20, based on local weather and market forecasts, and recommends soil improvement tips.
- Ramesh follows the advice—and gets notified if rainfall or price conditions change unexpectedly.

> No special technical knowledge is required. Kisaan-Mitra is designed to be farmer-friendly, with options for mobile and desktop access.

---

## 📝 Troubleshooting

- If the site doesn’t load, verify Node.js is installed and that you ran `npm install` and `npm start`.
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
    - Different agents focus on weather, soil, and market data.
    - Agents collaborate to produce optimal recommendations.
- **Personalized & Real-Time**
    - Advice is customized for each user and updated continuously.
- **Integrated Data Sources**
    - Fetches reliable data from open APIs and local sensors.
- **User-Friendly Interface**
    - Designed for easy, intuitive usage by farmers and agriculture professionals.
- **Modular Architecture**
    - Easily extendable to include more data sources or agents.

---

## 🏆 Tech Stack

- **TypeScript** (99.2%) – The primary language for application logic and agents.
- **HTML** (0.8%) – For user interface scaffolding and presentation.

---

## 🏛️ Architecture

```
+-------------------+        +------------------+        +------------------+
|   Weather Agent   |        |   Soil Agent     |        |   Market Agent   |
+-------------------+        +------------------+        +------------------+
          \                        |                           /
           \                       |                          /
            \                      |                         /
             +-----------------------------------------------+
             |         Recommendation Engine                 |
             +-----------------------------------------------+
                               |
                               v
                       +-------------------+
                       |  User Interface   |
                       +-------------------+
```

- **Agents**: Specialized modules for each domain.
- **Recommendation Engine**: Combines agent outputs for tailored advice.
- **User Interface**: Makes insights easy to understand and act upon.

---

## 📝 Contributing

We welcome contributions! Please:

1. **Fork** the repo and create your branch.
2. **Add your changes**—preferably in TypeScript for core logic.
3. **Test your changes** locally.
4. **Open a pull request** describing what you've added or fixed.

---

## 📚 Documentation

- Troubleshooting guide: see above

If you need more, please raise an issue or join our discussions.

---

## 🙋 FAQ

**Q:** Who is this for?  
_A:_ Rural farmers, extension officers, agtech developers.

**Q:** How can I localize this for my region?  
_A:_ The system is modular; translation and local data source support are planned. See documentation and contribute.

**Q:** Can I add my own sensor or agent?  
_A:_ Yes. See the agents directory and follow code conventions.

**Q:** Do I need to be technical?  
_A:_ No. We design the UI for non-technical users.

---

## 🏆 Acknowledgements

- Inspired by the vision to empower rural communities through technology.
- Created by Vikas-k-c and contributors.

---

> _Kisaan-Mitra strives to enable rural prosperity through intelligent methods. Your feedback helps us grow!_
