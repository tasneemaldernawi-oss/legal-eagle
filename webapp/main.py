import os
import flask
from legal import search_resource, ask_llm 
import vertexai
from flask import Flask, request, render_template, jsonify
from google.cloud import firestore
from vertexai.language_models import TextGenerationModel
import pypdf


app = Flask(__name__, template_folder='templates', static_folder='static')

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "legal-e-497511")
LOCATION = "us-central1"

vertexai.init(project=PROJECT_ID, location=LOCATION)
db = firestore.Client(project=PROJECT_ID)

@app.route('/',methods=['GET'])
def index():
    return render_template('index.html')

@app.route("/ask", methods=["POST"])
def ask():
    query = ''
    extracted_text = ''
    if request.is_json:
        data = request.get_json()
        query = data.get('question', '')
    else:
        query = request.form.get('question', '')
        uploaded_files = request.files.getlist('files')
        
        for file in uploaded_files:
            if file.filename != '':
                print(f"Processing uploaded file for legal compliance: {file.filename}")
                
                if file.filename.lower().endswith('.pdf'):
                    try:
                        pdf_reader = pypdf.PdfReader(file)
                        file_text = ""
                        for page in pdf_reader.pages:
                            text = page.extract_text()
                            if text:
                                file_text += text + "\n"
                        extracted_text += f"\n--- محتوى مستند ({file.filename}) ---\n{file_text}\n"
                    except Exception as pdf_err:
                        print(f"Error extracting PDF text: {str(pdf_err)}")
                
                elif file.filename.lower().endswith('.txt'):
                    try:
                        file_text = file.read().decode('utf-8')
                        extracted_text += f"\n--- محتوى مستند ({file.filename}) ---\n{file_text}\n"
                    except Exception as txt_err:
                        print(f"Error reading TXT file: {str(txt_err)}")

    if not query and not extracted_text:
        return jsonify({"error": "No input provided"}), 400
        
    try:

        if extracted_text and not query.strip():
            query = "الرجاء مراجعة وتدقيق المستند المرفق وفحص مدى امثاله للقوانين الليبية."
        final_query = f"{query}\n{extracted_text}".strip()
        
        if extracted_text:
            response_text = ask_llm(query=query, context_override=extracted_text)
        else:
            response_text = ask_llm(query=final_query)
        
        return response_text
        
    except Exception as e:
        print(f"Error occurred in backend logic: {str(e)}")
        return f"عذراً، حدث خطأ أثناء المعالجة القانونية: {str(e)}", 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), debug=True)