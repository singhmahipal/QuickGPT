# ✨ **Quick GPT — Full-Stack AI Chat Platform (MERN + OpenAI + Gemini)**

Transform ideas into **AI-powered conversations & images** with **Quick GPT**, a beautifully built MERN application integrating **OpenAI**, **Google Gemini**, **ImageKit**, and **Stripe** for a complete modern AI experience.

<p align="center">
  <img src="https://img.shields.io/badge/MERN%20Stack-20232A?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" />
  <img src="https://img.shields.io/badge/Stripe-6675FF?style=for-the-badge&logo=stripe&logoColor=white" />
  <img src="https://img.shields.io/badge/ImageKit-000?style=for-the-badge&logo=imagekit&logoColor=white" />
</p>

---

## 🚀 **Live Demo**

🔗 **[https://quick-gpt.vercel.app](https://quick-gpt.vercel.app)**

---

## ⭐ **Features**

### 🔐 **User Authentication**

* JWT-based secure login/signup
* Protected routes & persistent sessions

### 🤖 **AI Chat Interface**

* OpenAI & Google Gemini text generation
* Smart prompt handling
* Image generation via prompts

### 🖼️ **ImageKit Integration**

* AI-generated images stored & optimized automatically
* CDN-ready delivery

### 💳 **Stripe Credit System**

* Users purchase credits to unlock premium features
* Easy and secure checkout

### 🎨 **Modern UI / UX**

* Clean & responsive interface built with React + Tailwind
* Smooth animations & component-based structure

---

## 📂 **Project Structure**

```
quick-gpt/
├── client/                 # React frontend
│   ├── public/
│   └── src/
├── server/                 # Node.js backend
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   └── services/           # (AI, Stripe, ImageKit integrations)
├── .env
└── README.md
```

---

## 🛠️ **Tech Stack**

### **Frontend**

* React.js
* TailwindCSS
* Axios

### **Backend**

* Node.js
* Express.js
* MongoDB + Mongoose

### **AI / Integrations**

* OpenAI API
* Google Gemini API
* ImageKit Media API
* Stripe Payments

---

## ⚙️ **Local Setup**

### **1. Clone the Repository**

```bash
git clone https://github.com/your-repo/quick-gpt.git
cd quick-gpt
```

---

### **2. Install Backend**

```bash
cd server
npm install
```

---

### **3. Install Frontend**

```bash
cd client
npm install
```

---

### **4. Add Environment Variables**

#### **📌 `client/.env`**

```env
REACT_APP_OPENAI_API_KEY=your_openai_api_key
REACT_APP_IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
REACT_APP_API_URL=http://localhost:5000
```

#### **📌 `server/.env`**

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_api_key
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
```

---

### **5. Start the Backend**

```bash
npm start
```

### **6. Start the Frontend**

```bash
npm start
```

---

## 🚀 **Deployment Guide**

### **Frontend**

Deploy on **Vercel** or **Netlify** with one click.

### **Backend**

Deploy on:

* Render
* Railway
* DigitalOcean
* AWS / Heroku

Full environment variable support included.

---

## 📘 **Resources**

* Stripe Docs
* ImageKit Docs
* OpenAI Docs
* Google Gemini Docs
* MERN Tutorials

---

## 🤝 **Contributions**

Contributions, issues, and PRs are welcome.
Feel free to fork and improve the project!

---

## 📄 **License**

Licensed under the **MIT License**.

---

## 💬 **Connect with Me**

🔗 **Twitter:** @singhmahipal
🔗 **Instagram:** @singhmahipal
🔗 **LinkedIn:** /in/singhmahipal

