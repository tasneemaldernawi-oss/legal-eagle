#  Legal Eagle 

Legal Eagle is an AI-powered legal advisory platform designed to help organizations streamline and organize their legal compliance and regulatory research from start to finish. 

The system leverages a robust Retrieval-Augmented Generation (RAG) architecture integrated with advanced Gemini 2.5 Flash models to enable companies to verify regulations, audit uploaded materials, interpret conversational dialects, and generate legal templates through a centralized and highly secure platform.

By bringing all regulatory compliance activities into one place, Legal Eagle helps organizations improve efficiency, reduce legal overhead, and make faster, more informed corporate decisions.

##  Live Demo
[Live App] (https://legal-eagle-frontend-1096222424408.europe-west3.run.app/)

---
##  Key Capabilities

* **Real-time Compliance Verification:** Instantly verify corporate alignment against official rules and regulations.
* **Automated Regulatory Auditing:** Upload corporate materials and documents to receive automated legal audit reviews.
* **Dialect Interpretation & Multilingual Support:** Process complex legal queries and interpret conversational Libyan dialects smoothly.
* **Dynamic Compliance Calendar:** Calculate regulatory deadlines and track critical dates automatically.
* **Legal Template Generation:** Framework-driven corporate legal document and template generation.


---
## Architecture & Tech Stack
### Core Architecture:
* **Design Pattern:** Retrieval-Augmented Generation (RAG) for accurate legal grounding.
### Frontend & Backend 
* **Application Framework:** **Flask (Python)**
### AI Engine & RAG Orchestration
* **Language Model:** Google Gemini 2.5 Flash (via Vertex AI SDK)
* **Embedding Model:** Vertex AI Text Embedding API (`text-embedding-004` / modern Vertex embeddings)
* **Orchestration Framework:** LangChain (Python) for combining prompt templates, document contexts, system instructions, and LLM execution.
  
### Database & Storage (The Knowledge Base)
**Vector Database:** Google Cloud Firestore (leveraging native Vector Search capabilities for cosine similarity and fast document chunk matching).
**Document Ingestion Store:** Google Cloud Storage (GCS) Buckets for secure, unstructured legal document uploads.

###  Development & CI/CD
**Container Registry:** Google Artifact Registry (hosts the production docker images).
**Development Environment:** Google Cloud Shell IDE & Gemini Code Assist tools.

### Developers:
* **Tasneem Khaled Aldernawi**
* **Ramadan Osama Swedik**


