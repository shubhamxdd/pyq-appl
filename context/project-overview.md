# PYQ Solver & Sample Paper Generator

## Overview

A web application designed for students (K-12 and college) to upload their study resources—such as notes, syllabi, and past year papers—and receive AI-powered answers grounded in their materials or generate realistic sample papers. To maximize accuracy and speed for the MVP, the system uses a **Long-Context LLM approach via OpenRouter**, passing extracted text directly to the model instead of using a traditional RAG/Vector Database pipeline.

## Goals

1. **AI-Powered PYQ Solving**: Provide students with accurate, context-aware answers to past year questions using their own uploaded study materials.
2. **Sample Paper Generation**: Enable students to generate realistic practice exams based on their syllabus and previous papers.
3. **Simplified Processing**: Use OpenRouter's large context window models (e.g., Claude 3.5 Sonnet, Gemini 1.5 Pro) to process full documents without complex chunking/embedding.
4. **Freemium Model**: Offer a functional free tier with limited queries and resources, and a premium tier for unlimited access and advanced features.

## Core User Flow

1. **Sign Up/Login**: User authenticates via Email/Password or Google OAuth.
2. **Upload Resources**: User uploads PDFs or text files (notes, syllabi, past papers).
3. **Text Extraction**: The system extracts raw text from files and stores it in the database.
4. **Choose Service**: User selects either "PYQ Solver" or "Sample Paper Generator".
5. **Interact**: 
    - **Solver**: User enters a question; system sends relevant document text to LLM and streams an answer.
    - **Generator**: User selects resources; system generates a structured paper from the document context.
6. **Export**: User downloads the results as a PDF (Premium feature).

## Features

### Resource Management
- Multipart file upload (PDF, Text).
- Automated text extraction and cleaning using Python libraries.
- Centralized document text storage.

### PYQ Solver
- AI-powered answering using OpenRouter (Claude/Gemini).
- Streaming responses (SSE) for real-time interaction.
- Document-based context (passing text directly to the prompt).
- **Persistent Context**: Remembers active document selections per session.
- **Deep Linking**: URL-based routing for direct session access.

### Sample Paper Generator
- Automatic format detection from uploaded past papers.
- Customizable paper configurations (MCQ, Short, Long questions), editable in UI.
- On-demand PDF generation with dual modes (Full Study Guide vs. Clean Question Paper).
- Generation management: Rename, Delete, and Abort in-progress tasks.

### Real-Time Dashboard
- Live activity tracking with background generation status.
- Comprehensive usage metrics (Questions, Resources, Papers).
- Visual quota bars and "Remaining" credit indicators.

## Scope

### In Scope
- Python (FastAPI) backend for robust PDF processing.
- Long-context LLM via OpenRouter.
- PDF and Plain Text file support.
- OCR/AI-based text extraction for scanned documents.
- Email/Password and Google OAuth authentication.
- Automatic routing between Streaming and Background processing.
- PDF Export for answers and papers.
- DigitalOcean Object Storage (Spaces).

### Out of Scope (Deferred to v0.2+)
- Image and handwriting support (Vision models).
- Maths and formula-heavy subjects (LaTeX).
- Payment integration (Stripe).
- In-house Vector RAG (only if document size exceeds LLM context limits).

## Success Criteria

1. A user can successfully upload a PDF and have its text extracted within 30 seconds.
2. The PYQ Solver provides answers based correctly on the uploaded document text.
3. The system automatically handles long-running generations (papers) in the background.
4. Premium features (PDF download) are correctly gated.
