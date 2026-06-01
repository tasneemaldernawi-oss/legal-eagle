const questionInput = document.getElementById('questionInput');
const submitBtn = document.getElementById('submitBtn');
const answerArea = document.getElementById('answerArea');
const chatWindow = document.getElementById('chatWindow');
const welcomeSplash = document.getElementById('welcomeSplash');

function appendChatBubble(role, message) {
    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = `flex flex-col gap-1 ${role === 'user' ? 'items-end' : 'items-start'}`;

    const bubble = document.createElement('div');
    if (role === 'user') {
        bubble.className = "bg-leather dark:bg-gold text-doc p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] transition-colors";
        bubble.innerHTML = `<p class="font-bold text-gold dark:text-white mb-1">أنت</p><p>${message}</p>`;
    } else {
        bubble.className = "bg-white dark:bg-[#1a0c02] border border-gray-200 dark:border-wood p-4 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] text-wood dark:text-gray-200 overflow-x-auto transition-colors";
        bubble.innerHTML = `<p class="font-bold text-leather dark:text-gold mb-1">المستشار (Legal Eagle)</p><div class="prose prose-sm md:prose-base dark:prose-invert prose-headings:text-leather dark:prose-headings:text-gold prose-a:text-gold text-wood dark:text-gray-200">${message}</div>`;
    }

    bubbleWrapper.appendChild(bubble);
    answerArea.appendChild(bubbleWrapper);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Global variable holding the client-side extracted text from files (Your feature)
let extractedFileText = "";

// Bouncing dots loading animation
function showLoading() {
    const loadingHtml = `
        <div class="flex flex-col gap-1 items-start" id="loadingBubble">
            <div class="bg-white dark:bg-[#1a0c02] border border-gray-200 dark:border-wood p-4 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] text-wood dark:text-gray-200 flex gap-3 items-center transition-colors">
                <p class="font-bold text-leather dark:text-gold">يراجع القوانين</p>
                <div class="flex space-x-1 space-x-reverse mt-1">
                    <div class="w-2 h-2 bg-gold rounded-full animate-bounce" style="animation-delay: 0s"></div>
                    <div class="w-2 h-2 bg-gold rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                    <div class="w-2 h-2 bg-gold rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
                </div>
            </div>
        </div>
    `;
    answerArea.insertAdjacentHTML('beforeend', loadingHtml);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function hideLoading() {
    const loader = document.getElementById('loadingBubble');
    if (loader) loader.remove();
}

async function askLegalEagle() {
    const question = questionInput.value.trim();

      
    // We allow execution if there's a text query OR if a file has text extracted in the background.
    
    if (!question && !extractedFileText.trim() && selectedFiles.length === 0) return;

    // Safely package and combine the texts before wiping the input elements
    let finalPayloadText = question;
    let bubbleDisplayMessage = question;

    if (extractedFileText.trim() !== "") {
        finalPayloadText = `[Uploaded document content for your analysis]\n${extractedFileText}`;
        if (question) {
            finalPayloadText += `\n\nUser Query/Notes regarding this document:\n${question}`;
            bubbleDisplayMessage = `📄 [مستند مرفق] + ملاحظة: ${question}`;
        } else {
            bubbleDisplayMessage = `📄 [مستند مرفق للمراجعة والتدقيق القانوني]`;
        }
    }

    // Hide splash screen on first message
    if (welcomeSplash) welcomeSplash.style.display = 'none';

    // Show the immediate bubble feedback
    appendChatBubble('user', bubbleDisplayMessage);
    questionInput.value = ''; 
    submitBtn.disabled = true;
    questionInput.disabled = true;

    showLoading(); // Show fancy loading dots

    try {
        let fetchOptions = {};
       
        /*
           We still use  Multipart FormData logic so the files stream directly 
           to  bucket storage. However, we swap 'question' with 'finalPayloadText' which contains 
           the pre-extracted text layout from the client reader. 
        */
        if (selectedFiles.length > 0) {
            const formData = new FormData();
            formData.append('question', finalPayloadText); // Extracted text injected cleanly here!
            selectedFiles.forEach((file, index) => {
                formData.append('files', file); // Keeps his array stream for GCP bucket upload intact
            });
            
            fetchOptions = {
                method: 'POST',
                body: formData 
            };
        } else {
            fetchOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: finalPayloadText })
            };
        }

        const response = await fetch('/ask', fetchOptions);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        
        const markdownText = await response.text();
        const htmlContent = marked.parse(markdownText); 
        
        hideLoading(); 
        appendChatBubble('ai', htmlContent);

        // State reset upon a completely successful transaction loop
        clearSelectedFile();

    } catch (error) {
        console.error("Error:", error);
        hideLoading();
        appendChatBubble('ai', "<p class='text-red-500'>عذراً، حدث خطأ في الاتصال بالخوادم السحابية.</p>");
    } finally {
        submitBtn.disabled = false;
        questionInput.disabled = false;
        questionInput.focus();
    }
}

submitBtn.addEventListener('click', askLegalEagle);
questionInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') askLegalEagle();
});

// Theme and Dark Mode Logic
const themeToggleBtn = document.getElementById('themeToggle');
const htmlElement = document.documentElement;

themeToggleBtn.addEventListener('click', () => {
    htmlElement.classList.toggle('dark');
});

// Sidebar Logic
const menuToggle = document.getElementById('menuToggle');
const closeMenu = document.getElementById('closeMenu');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function openSidebar() {
    sidebar.classList.remove('-translate-x-full');
    sidebarOverlay.classList.remove('hidden');
}

function closeSidebar() {
    sidebar.classList.add('-translate-x-full');
    sidebarOverlay.classList.add('hidden');
}

menuToggle.addEventListener('click', openSidebar);
closeMenu.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);


// File Drag and Drop & Upload UI Logic
const clipBtn = document.getElementById('clipBtn');
const fileInput = document.getElementById('fileInput');
const dropOverlay = document.getElementById('dropOverlay');
const filePreview = document.getElementById('filePreview');
let selectedFiles = [];

// Dynamically fetch and attach the standard pdf.js engine scripts in the runtime environment
if (typeof pdfjsLib === 'undefined') {
    const pdfScript = document.createElement('script');
    pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    pdfScript.onload = () => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    };
    document.head.appendChild(pdfScript);
} else {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}

// Trigger file input when the clip button is clicked
clipBtn.addEventListener('click', () => fileInput.click());

// Handle file selection from input
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// Drag and drop events
let dragCounter = 0;

document.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
        dropOverlay.classList.remove('hidden');
        dropOverlay.classList.add('flex');
    }
});

document.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
        dropOverlay.classList.add('hidden');
        dropOverlay.classList.remove('flex');
    }
});

document.addEventListener('dragover', (e) => {
    e.preventDefault(); 
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropOverlay.classList.add('hidden');
    dropOverlay.classList.remove('flex');
    if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
    }
});

function handleFiles(files) {
    Array.from(files).forEach(file => {
        selectedFiles.push(file);
        
        // Add a visual badge for the file
        const fileBadge = document.createElement('div');
        fileBadge.className = 'bg-gold/10 text-wood dark:text-doc border border-gold/50 rounded-full px-3 py-1 flex items-center gap-2 max-w-full';
        fileBadge.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span class="truncate text-xs font-bold" id="badgeStatusText_${selectedFiles.length}" dir="ltr">⏳ Processing: ${file.name}...</span>
            <button type="button" class="text-red-500 hover:text-red-700 ml-1 font-bold shrink-0">&times;</button>
        `;
        
        // Handle file removal from UI and state array
        fileBadge.querySelector('button').addEventListener('click', () => {
            fileBadge.remove();
            selectedFiles = selectedFiles.filter(f => f !== file);
            if(selectedFiles.length === 0) clearSelectedFile();
        });
        
        filePreview.appendChild(fileBadge);
        filePreview.classList.remove('hidden');
        filePreview.classList.add('flex');

        const badgeTextElement = document.getElementById(`badgeStatusText_${selectedFiles.length}`);

        // Extract TXT layout content
        if (file.name.endsWith('.txt')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                extractedFileText += `\n--- Content of ${file.name} ---\n` + e.target.result;
                if (badgeTextElement) badgeTextElement.innerText = ` Ready: ${file.name}`;
            };
            reader.readAsText(file);
        } 
        // Extract PDF layout pages via pdf.js pipeline
        else if (file.name.endsWith('.pdf')) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const typedarray = new Uint8Array(e.target.result);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    let fullText = `\n--- Content of ${file.name} ---\n`;
                    
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += pageText + '\n';
                    }
                    
                    extractedFileText += fullText;
                    if (badgeTextElement) badgeTextElement.innerText = ` Ready: ${file.name} (${pdf.numPages} pgs)`;
                } catch (error) {
                    console.error("PDF Parsing error:", error);
                    if (badgeTextElement) badgeTextElement.innerText = ` Parsing Failed: ${file.name}`;
                }
            };
            reader.readAsArrayBuffer(file);
        }
    });
}

// Flush memory arrays and reset placeholders
function clearSelectedFile() {
    extractedFileText = "";
    selectedFiles = [];
    fileInput.value = "";
    if (filePreview) {
        filePreview.innerHTML = '';
        filePreview.classList.add('hidden');
    }
    questionInput.placeholder = "اكتب استشارتك القانونية هنا...";
}