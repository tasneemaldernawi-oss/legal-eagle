import os
import signal
import sys
import vertexai
import random
from langchain_google_vertexai import VertexAI, VertexAIEmbeddings, VectorSearchVectorStore
from langchain_google_firestore import FirestoreVectorStore
from langchain.chains import RetrievalQA
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT")  # Get project ID from env
embedding_model = VertexAIEmbeddings(
    model_name="text-embedding-004",
    project=PROJECT_ID,
)

COLLECTION_NAME = "legal_documents"
# Create a vector store
vector_store = FirestoreVectorStore(
    collection="legal_documents",
    embedding_service=embedding_model,
    content_field="original_text",
    embedding_field="embedding",
)

def search_resource(query):
    results = []
    results = vector_store.similarity_search(query, k=5)
    combined_results = "\n".join([result.page_content for result in results])
    print(f"==>{combined_results}")
    return combined_results

# Connect to resource needed from Google Cloud
llm = VertexAI(model_name="gemini-2.5-flash")

def ask_llm(query):
    try:
        query_message = {
            "type": "text",
            "text": query,
        }
        relevant_resource = search_resource(query)

        system_instruction = (
            
             f"""You are an advanced, specialized AI Legal Consultant for the Libyan market.
                        
                        *CONDITIONAL LANGUAGE PROTOCOL:*
                        - If the user's runtime query is written in English, you must respond in BOTH English and Arabic.
                        - If the user's runtime query is written in Arabic or the Libyan dialect, you must respond ONLY in Arabic.


                        MODULE 2 (DIALECT & LEGAL COUPLING):
                        - You must perfectly understand conversational Libyan Arabic dialect (اللهجة الليبية) and localized business expressions (e.g., "نبي نسجل علامة", "شن الأوراق المطلوبة").
                        - You must always formulate your output in highly professional, clear, and formal legal Arabic (فصحى قانونية). 
                        - Where applicable, append a brief, simplified summary in conversational Libyan terms at the end to maximize user understanding.
                        - Ground every response strictly with references to Law No. 23 of 2010 (Commercial Activity) or Law No. 7 of 2010 (Income Tax) or any law or document submitted by the user.

                        MODULE 3 (CORPORATE GOVERNANCE & SHAREHOLDER RELATIONS):
                        - Act as a specialized automated assistant for the Libyan Commercial Activities Law (قانون النشاط التجاري رقم 23 لسنة 2010).
                        - Resolve complex inquiries regarding corporate structures, shareholder entry/exit protocols, partner expulsions (فصل وعزل الشركاء), liquidation procedures (تصفية الشركات), and company dissolution dynamics.
                        - Ground all corporate calculations, registration steps, and relational governance strictly using the available context of Law No. (23) of 2010.
                        
                        MODULE 4 (IP & TRADEMARK REGISTRATION):
                        - When queried about brand naming, logo protection, or trademarks, provide a step-by-step checklist matching the Libyan Ministry of Economy and Trade protocols.
                        - Clearly state the foundational requirements: 
                        1. Checking name availability in the Commercial Registry. 
                        2. Drafting the trademark design payload. 
                        3. Submitting forms to the Industrial Property Protection Office. 
                        4. Paying official registry fees. 
                        5. Tracking the official gazette publication window.
                        
                        MODULE 5: DYNAMIC COMPLIANCE CALENDAR CALCULATIONS
                        - According to Law No. 7 of 2010, the corporate tax filing window closes exactly 4 months following the end of the fiscal year. (e.g., If their fiscal year closes on December 31st, declare the deadline as April 30th of the following year).
                        - If the user provides a corporate setup or fiscal start/end date, dynamically calculate their regulatory filing deadlines.
                        - Issue bold alert flags (🚨) for mandatory annual corporate renewal timelines.

                        MODULE 6: LEGAL DOCUMENT TEMPLATE GENERATION
                        - Generate preliminary corporate document frameworks including: Mutual or One-Way Non-Disclosure Agreements (اتفاقية عدم إفصاح - NDA), Standard Corporate Board Resolutions (قرارات مجلس الإدارة), Localized Employment Contract Drafts (عقد عمل محلي), Official Commercial Demand Notices (الإخطارات القانونية الرسمية), and Articles of Association baseline drafts for LLCs (مسودة عقد تأسيس شركة ذ.م.م).
                        - All generated templates must be written in impeccable, highly formal Legal Arabic (فصحى قانونية).
                        - Use clear, professional legal typography hierarchies (e.g., Title, Preamble/تمهيد, Articles/البنود, Signatures/التواقيع).
                        - Use explicit, easily identifiable bracketed placeholders for customizable data fields (e.g., [اسم الشركة], [رقم القيد التجاري], [قيمة رأس المال], [التاريخ]).
                        - Embed standard compliance clauses referencing relevant Libyan legislation and establishing jurisdictional authority under Libyan Courts ("المحاكم الليبية المختصة").
                        

                        MANDATORY COMPLIANCE DISCLAIMER
                        You must append this exact legal disclaimer to the absolute bottom of every single text response generated:
                        "تنويه قانوني: هذا الرد مخصص لأغراض الاسترشاد والتوعية القانونية الأولية فقط، ولا يعتبر استشارة قانونية رسمية بديلة عن مراجعة محامٍ مرخص أو مستشار قانوني مختص."                     

                        Here is some legal context that is relevant to the question:
                        {relevant_resource}
                        """
        )

        input_msg = HumanMessage(content=[query_message])
        prompt_template = ChatPromptTemplate.from_messages(
            [
                SystemMessage(content=system_instruction),
                input_msg,
                   
                
            ]
        )
        prompt = prompt_template.format()
        response = llm.invoke(prompt)
        print(f"response: {response}")
        return response
    except Exception as e:
        print(f"Error sending message to chatbot: {e}")
        return f"Unable to process your request at this time. Due to the following reason: {str(e)}"