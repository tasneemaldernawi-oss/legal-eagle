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
    if (!question) return;

    // Hide splash screen on first message
    if (welcomeSplash) welcomeSplash.style.display = 'none';

    appendChatBubble('user', question);
    questionInput.value = ''; 
    submitBtn.disabled = true;
    questionInput.disabled = true;

    showLoading(); // Show fancy loading dots

    try {
        // --- BACKEND DEVELOPER NOTE ---
        // If files are selected, we send FormData (Multipart) so you can upload to GCP Bucket.
        // Otherwise, send standard JSON for just the text prompt.
        let fetchOptions = {};
        
        if (selectedFiles.length > 0) {
            const formData = new FormData();
            formData.append('question', question);
            selectedFiles.forEach((file, index) => {
                formData.append('files', file); // Array of files for the backend to upload to bucket
            });
            
            fetchOptions = {
                method: 'POST',
                body: formData // No Content-Type header needed for FormData; browser sets it automatically with boundary
            };
        } else {
            fetchOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question })
            };
        }

        const response = await fetch('/ask', fetchOptions);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        
        const markdownText = await response.text();
        const htmlContent = marked.parse(markdownText); 
        
        hideLoading(); // Remove loading dots
        appendChatBubble('ai', htmlContent);

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
    e.preventDefault(); // Crucial for drop to work
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
        // Here your colleague can write the upload backend logic
        selectedFiles.push(file);
        
        // Add a visual badge for the file
        const fileBadge = document.createElement('div');
        fileBadge.className = 'bg-gold/10 text-wood dark:text-doc border border-gold/50 rounded-full px-3 py-1 flex items-center gap-2 max-w-full';
        fileBadge.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span class="truncate text-xs font-bold" dir="ltr">${file.name}</span>
            <button type="button" class="text-red-500 hover:text-red-700 ml-1 font-bold shrink-0">&times;</button>
        `;
        
        // Handle file removal from UI
        fileBadge.querySelector('button').addEventListener('click', () => {
            fileBadge.remove();
            selectedFiles = selectedFiles.filter(f => f !== file);
            if(selectedFiles.length === 0) filePreview.classList.add('hidden');
        });
        
        filePreview.appendChild(fileBadge);
        filePreview.classList.remove('hidden');
        filePreview.classList.add('flex');
    });
}