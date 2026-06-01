import os
import signal
import sys
import vertexai
import random
import re
from langchain_google_vertexai import ChatVertexAI, VertexAIEmbeddings
from langchain_google_firestore import FirestoreVectorStore
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT")  
embedding_model = VertexAIEmbeddings(
    model_name="text-embedding-004",
    project=PROJECT_ID,
)

COLLECTION_NAME = "legal_documents"
vector_store = FirestoreVectorStore(
    collection=COLLECTION_NAME,
    embedding_service=embedding_model,
    content_field="original_text",
    embedding_field="embedding",
)

def search_resource(query):
    try:
        all_candidates = vector_store.similarity_search(query, k=15)
    except Exception as e:
        print(f"Error fetching: {e}")
        return ""

    article_match = re.search(r'(?:مادة|المادة|ماده)\s*\(?(\d+)\)?', query)
    verified_chunks = []
    
    if article_match:
        target_article = article_match.group(1)
        for doc in all_candidates:
            text = doc.page_content
            metadata = doc.metadata or {}
            if (f"مادة ({target_article})" in text or 
                f"مادة {target_article}" in text or 
                str(metadata.get('article_number')) == target_article):
                verified_chunks.append(text)
                
    if not verified_chunks:
        search_maps = {
            ("ديون", "أخطاء", "المدير"): ("أخطاء", "ديون", "المدير"),
            ("سن", "أهلية", "عمر"): ("السن", "أهلية", "بلغ")
        }
        for query_keys, text_keys in search_maps.items():
            if any(key in query for key in query_keys):
                for doc in all_candidates:
                    text = doc.page_content
                    if any(t_key in text for t_key in text_keys):
                        verified_chunks.append(text)

    if not verified_chunks:
        verified_chunks = [doc.page_content for doc in all_candidates[:5]]

    combined_results = "\n\n".join(verified_chunks)
    print(f"==> Provided Context to Gemini:\n{combined_results[:300]}...")
    return combined_results
    
    print(f"==> Provided Context to Gemini:\n{combined_results[:300]}...")
    return combined_results

llm = ChatVertexAI(model_name="gemini-2.5-flash")

def ask_llm(query, context_override=None):
    try:
        if context_override:
            relevant_resource = context_override
        else:
            relevant_resource = search_resource(query)

        system_instruction = (
            """You are an advanced, specialized AI Legal Consultant for the Libyan market.
Do not hallucinate. If the user provides a document snippet, extract laws strictly from the provided text context before checking your vector database.
If the document text payload is empty or fails to load, do not guess, hallucinate, or recall article numbers from your baseline memory. Clearly inform the user that the document text could not be read.

*CONDITIONAL LANGUAGE PROTOCOL:*
- If the user's runtime query is written in English, you must respond in BOTH English and Arabic.
- If the user's runtime query is written in Arabic or the Libyan dialect, you must respond ONLY in Arabic.

MODULE 1 (SMART COMPLIANCE AUDITING & CONTRACT REVIEW):
- Act as an expert legal auditor validating corporate drafts, clauses, agreements, or baseline frameworks against the Libyan Commercial Activities Law No. 23 of 2010.
- Analyze any provided user contract text or clause strictly. Identify explicitly if it violates any statutory provisions (e.g., minimum capital requirements for LLCs, shareholder constraints, mandatory registration protocols).
- For every detected violation, anomaly, or legal gap, you must structure your audit findings cleanly:
  1. [المخالفة / الثغرة القانونية]: Explicitly call out the non-compliant phrase or structure.
  2. [السند القانوني]: Cite the precise article or principle from the Commercial Law No. 23 of 2010.
  3. [الصياغة البديلة المصححة]: Provide an absolute, fully corrected, professional legal substitute text in formal legal Arabic complying completely with local regulations.

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
  3. Submitting forms to the Industrial Property Property Office. 
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

---
CONNECTED LEGAL CONTEXT (DATABASE EXCERPTS):
\"\"\"
{relevant_resource}
\"\"\"
"""
        )

        prompt_template = ChatPromptTemplate.from_messages([
            SystemMessage(content=system_instruction),
            HumanMessage(content=query)
        ])
        

        chain = prompt_template | llm
        response = chain.invoke({"query": query})
        
        return response.content
    except Exception as e:
        print(f"Error sending message to chatbot: {e}")
        return f"Unable to process your request at this time. Due to the following reason: {str(e)}"

# Feature 1: Smart Auditor
def audit_document(document_text):
    try:
        auditor_user_prompt = f"""
Act strictly as an expert legal auditor checking the user's uploaded document text.

CRITICAL RULE: Rely ONLY on the provided text below. Do NOT assume, merge, or pull external article contents from your training memory or general knowledge if they contradict the text provided.

If the article number in the text says 'مادة (70) حل الشركة', analyze it strictly as 'حل الشركة' and do not link it to 'حق الاطلاع' or any other article.

[SYSTEM PROTOCOL]: Apply MODULE 1 directions using ONLY this text:

[NATIVE DOCUMENT TEXT TO AUDIT]:
\"\"\"
{document_text}
\"\"\"
"""
        response = ask_llm(query=auditor_user_prompt, context_override=document_text)
        return response

    except Exception as e:
        print(f"Error processing document: {e}")
        return f"Unable to process document at this time. Due to the following reason: {str(e)}"