import os
import json
import io
import time
from google.cloud import storage
from google.cloud import vision
import functions_framework
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_google_firestore import FirestoreVectorStore
from langchain.text_splitter import RecursiveCharacterTextSplitter
from pdf2image import convert_from_bytes


PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT")

# Initialize Vertex AI Embedding model
embedding_model = VertexAIEmbeddings(
    model_name="text-embedding-004",
    project=PROJECT_ID,
    credentials=os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"),
)

COLLECTION_NAME = "legal_documents"

# Initialize Firestore Vector Store client
vector_store = FirestoreVectorStore(
    collection=COLLECTION_NAME,
    embedding_service=embedding_model,
    content_field="original_text",
    embedding_field="embedding",
)

def extract_clean_arabic_pdf(pdf_io_bytes):
    """
    Converts PDF pages into images in-memory and processes them using 
    Google Cloud Vision OCR to guarantee flawless visual Arabic layout extraction.
    """
    print("Converting PDF bytes to images for OCR processing...")

    # convert entire PDF bytes into a list of PIL images
    pages = convert_from_bytes(pdf_io_bytes.read(), dpi=100, fmt="jpeg", jpegopt={"quality": 75})

    # initialize the synchronous Google cloud Vision client
    vision_client = vision.ImageAnnotatorClient()
    extracted_pages = []
   
    for page_num, page_image in enumerate(pages):
        print(f"Processing OCR for Page {page_num + 1} of {len(pages)}...")
        
        # Save PIL image to an in-memory byte buffer as JPEG
        image_byte_arr = io.BytesIO()
        page_image.save(image_byte_arr, format='JPEG')
        image_bytes = image_byte_arr.getvalue()
        
        # Prepare the Cloud Vision Image wrapper object
        image = vision.Image(content=image_bytes)
        
        # Invoke structural document text detection (optimized for dense legal paragraphs)
        response = vision_client.document_text_detection(image=image)
        text = response.full_text_annotation.text
        
        if text and text.strip():
            # Append unified text structure mapped to its original reference layout
            extracted_pages.append(f"--- [Page {page_num + 1}] ---\n{text}")
            
    return "\n\n".join(extracted_pages)

@functions_framework.cloud_event
def process_file(cloud_event):
    print(f"CloudEvent received: {cloud_event.data}")
     
    try:
        event_data = cloud_event.data
        bucket_name = event_data['bucket']
        file_name = event_data['name']
    except (json.JSONDecodeError, AttributeError, KeyError) as e:
        print(f"Error decoding CloudEvent data: {e}")
        return "Error processing event", 500
   
    # Ignore standalone folder creation triggers
    if file_name.endswith('/'):
        print(f"Skipping folder creation event: {file_name}")
        return "Folder skipped", 200

    print(f"New file detected in bucket: {bucket_name}, file: {file_name}")
    
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(file_name)
    
    try:
        file_content_string = ""
        is_pdf = file_name.lower().endswith('.pdf')
        
        # PIPELINE: Dynamic File Routing
        if is_pdf:
            print(f"Processing multi-page PDF file with Visual Cloud OCR: {file_name}")
            pdf_bytes = blob.download_as_bytes()
            pdf_file = io.BytesIO(pdf_bytes)
            
            # Extract clean, programmatic text strings visually using Cloud Vision
            file_content_string = extract_clean_arabic_pdf(pdf_file)
        
        elif file_name.lower().endswith('.txt'):
            print(f"Processing native Text file: {file_name}")
            file_content_string = blob.download_as_string().decode("utf-8")
        
        else:
            print(f"Unsupported file format for embedding: {file_name}")
            return "Unsupported format", 200

        # Structural Halt: Check if extraction yield was valid
        if not file_content_string.strip():
            print(f"Warning: No valid Arabic text could be extracted from: {file_name}")
            return "No text extracted", 200

        print(f"File content successfully unified via OCR layer. Chunking documents...")
        
        # Split text strategically for the RAG architecture
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,       
            chunk_overlap=200,    
            length_function=len,
        )
        text_chunks = text_splitter.split_text(file_content_string)
        print(f"Text split into {len(text_chunks)} clean vector chunks.")

        # Create explicit LangChain Document objects 
        from langchain_core.documents import Document
        docs = [
            Document(page_content=chunk, metadata={"source": file_name}) 
            for chunk in text_chunks
        ]

        # Pipeline Terminal Step: Upload to Firestore Vector Store in spaced safe batches
        BATCH_SIZE = 2  
        for i in range(0, len(docs), BATCH_SIZE):
            batch_docs = docs[i:i + BATCH_SIZE]
            
            print(f"Generating embeddings for chunks {i} to {i + len(batch_docs)} using text-embedding-004...")
            
            # Upsert into Firestore
            vector_store.add_documents(
                documents=batch_docs,
                batch_size=len(batch_docs)
            )
            
            print("Taking a 5-second technical break to reset Rate Limits...")
            time.sleep(5.0)
            
        print(f"File processing and Firestore upsert complete for file: {file_name}")
        return "File processed successfully", 200
        
    except Exception as e:
        print(f"Error processing file {file_name}: {e}")
        return f"Error: {str(e)}", 500