# ProcureAI — AI-Powered Integrated Bid Compliance Verification Platform

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/) [![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/) [![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/) [![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/) [![Groq](https://img.shields.io/badge/Groq-AI_Assistant-F55036)](https://groq.com/) [![Tesseract.js](https://img.shields.io/badge/Tesseract.js-OCR-5A29E4)](https://github.com/naptha/tesseract.js) [![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/) [![React Flow](https://img.shields.io/badge/React_Flow-Graph-FF0072)](https://reactflow.dev/)

> **"From scattered bidder documents to structured, evidence-backed procurement intelligence."**

---

## 🖥️ Project

![1st Image](1st_img.png)
![2nd Image](2nd_img.png)
![3rd Image](3rd_img.png)
![4th Image](4th_img.png)

**ProcureAI** is an AI-powered procurement platform designed to help procurement officers analyze bidder documents, verify tender compliance, identify inconsistencies and potential relationships, and compare multiple bidders using structured procurement intelligence.

---

## 🎯 Problem Statement

Government and enterprise procurement involves reviewing large volumes of bidder documents such as GST certificates, PAN cards, experience certificates, OEM authorizations, technical documents, and financial documents.

Manual verification is time-consuming and makes it difficult to:

- Extract information consistently
- Cross-check information across documents
- Track bidder information across tenders
- Identify potential relationships between bidders
- Compare multiple bidders systematically

---

## 💡 Solution

ProcureAI combines **OCR, AI document understanding, deterministic validation, compliance analysis, risk analysis, bidder intelligence, and relationship visualization** into one workflow.

```text
Tender
   ↓
Requirements
   ↓
Bidder Documents
   ↓
PDF / OCR Extraction
   ↓
Gemini AI Extraction
   ↓
Pydantic Validation
   ↓
Compliance & Risk Analysis
   ↓
Bidder Intelligence
   ↓
Relationship Graph
   ↓
Multi-Bidder Comparison
   ↓
Officer Review
```

## 🏗️ System Architecture

![System Architecture](system_archi.png)

## 🛠️ Technology Stack

![Technology Stack](tech_stack.png)

---

## 📁 Project Structure

```text
procure_ai_prototype/
│
├── backend/
│   ├── routers/
│   ├── schemas/
│   ├── services/
│   ├── models/
│   ├── uploads/
│   ├── config.py
│   ├── database.py
│   ├── main.py
│   ├── seed.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.*
│
├── ocr_worker/
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   └── eng.traineddata
│
├── package.json
├── package-lock.json
└── README.md
```
