# 🦅 Legal Eagle — Team Development Runbook

Welcome to the internal engineering repository for **Legal Eagle**. This project is an automated, event-driven Legal Document Assistant utilizing a Retrieval-Augmented Generation (RAG) pattern running entirely on Google Cloud Platform (GCP).

## 🌐 Live Application Link
The interactive conversational web application is live and accessible at:
👉 **[Legal Eagle Web App Interface](https://legal-eagle-webapp-1096222424408.us-central1.run.app)**

---

## 🏗️ Architecture in 4 Simple Steps

Here is how the system handles data, broken down simply:

* **Step 1 (Ingestion):** A user uploads a legal document (PDF or TXT) into the **Google Cloud Storage Bucket**.
* **Step 2 (Trigger):** An automated **Eventarc Trigger** detects the new file instantly and wakes up the backend loader service.
* **Step 3 (Processing):** The **Loader Service (`/loader`)** reads the file, cuts it into small text paragraph blocks (**Chunks**), converts those blocks into math vectors (**Embeddings**), and saves them inside the **Firestore Database**.
* **Step 4 (Generation):** When a user types a question in the **Web App (`/webapp`)**, the app finds the most relevant text chunks from Firestore, passes them to **Gemini** as trusted legal context, and streams the final smart answer back to the user interface.

---
### Team Onboarding & Workspace Setup 
If you have just been added to this project via GCP IAm permissions, follow these steps to connect your Cloud Shell to the shared enviroment:

### 1. Authenticate your Cloud Shell
Open you Google Cloud shell Terminal and log into your Google account:
```bash
gcloud auth login
```
Click the link generated in the terminal, log into you authorized Gmail, and click **Allow**.

### 2. Link to the Shared Project ID
Switch your local cloud context to target the main production environment:
```bash
gcloud config set project legal-e-497511
export PROJECT_ID=legal-e-497511
```

### 3. Verify Shared Infractructure Access
Run these commands to verify that you can successfully see the live cloud resources:
```bash
# Check shared storage buckets
gcloud storage buckets list

# Check live microservices
gcloud run services list --region us-central1
```

## 💻 How to Use and Run this Repo (Quick Start Guide)
first make sure to create new project and activate the Google Cloud Shell.

### 1. Clone the Repository
Open your Cloud Shell terminal and pull the code from GitHub:
```bash
git clone [https://github.com/tasneemaldernawi-oss/legal-eagle.git](https://github.com/tasneemaldernawi-oss/legal-eagle.git)
cd legal-eagle
```

### 2.Deploy the Loader Backend

Navigate to the loader folder and deploy it to Cloud Run so it can handle files:
```bash
cd ~/legal-eagle/loader
gcloud run deploy loader-function --source . --region us-central1 --no-allow-unauthenticated
```
### 3. Deploy the Web App Frontend
Navigate to the webapp folder and deploy the Flask chatbot interface (with required 1Gi memory):
```bash
cd ~/legal-eagle/webapp
gcloud run deploy legal-eagle-webapp \
  --source . \
  --region us-central1 \
  --memory 1Gi \
  --set-env-vars=GOOGLE_CLOUD_PROJECT=$PROJECT_ID,PROJECT_ID=$PROJECT_ID \
  --allow-unauthenticated
```

---

##  Git Workflow & Collaboration 

To maintain codebase stability and ensure we don't break production deployments, we will adhere to the **Feature Branch Workflow**:

1. **Main Branch (`main`):** Contains the functional, live production deployment code.
2. **Feature Development:** Always spin up a new branch locally before editing features or adding new scripts:
```bash
   git checkout -b feature/your-feature-name
   ```

### 🛑 Critical Repository Hygiene Rules
* **Excluding Heavy Files:** Never commit virtual environment folders (`env/` or `venv/`). Ensure your `.gitignore` configuration stays updated.

---

## 📥 How to Upload New Legal Documents (only for development)

To feed additional corporate files, legal briefs, or custom law case documents into the RAG pipeline, use:


### Method : Google Cloud Console UI
1. Navigate to the GCP Web Console and open the **Cloud Storage > Buckets** panel.
2. Choose the bucket instance assigned to your environment (ending with `-doc-bucket`).
3. Click the **"UPLOAD FILES"** banner and drop your PDFs or text logs.

---

## 🚀 Building Container Images & Redeployment Rules

To eliminate local Docker engine connectivity constraints and configuration timeouts, **always execute Source-Based Builds**. Using `--source .` compiles your container directly inside Google Cloud, updates Artifact Registry, and refreshes the service smoothly.[cite: 1, 2]

### ❓ When to Rebuild vs. When to Redeploy?
* **Full Container Build Needed:** Every time you modify application logic (e.g., changes inside `main.py`), write new routes, update underlying logic, or add a package to `requirements.txt`.[cite: 1, 2]
* **Parameter Deployment Only:** When you only need to change environmental definitions, API tokens, or project configuration profiles without touching code.[cite: 1, 2]
