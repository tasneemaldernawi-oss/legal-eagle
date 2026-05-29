const questionInput = document.getElementById('questionInput');
const submitBtn = document.getElementById('submitBtn');
const answerArea = document.getElementById('answerArea');
const chatWindow = document.getElementById('chatWindow');

// Function to add a chat bubble (User or AI)
function appendChatBubble(role, message) {
    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = `flex flex-col gap-1 ${role === 'user' ? 'items-end' : 'items-start'}`;

    const bubble = document.createElement('div');
    
    if (role === 'user') {
        bubble.className = "bg-leather text-doc p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[85%]";
        bubble.innerHTML = `<p class="font-bold text-gold mb-1">You</p><p>${message}</p>`;
    } else {
        bubble.className = "bg-white border border-gray-200 p-4 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] text-wood overflow-x-auto";
        bubble.innerHTML = `<p class="font-bold text-leather mb-1">المستشار القانوني (Legal Eagle)</p><div class="prose prose-sm md:prose-base prose-headings:text-leather prose-a:text-gold">${message}</div>`;
    }

    bubbleWrapper.appendChild(bubble);
    answerArea.appendChild(bubbleWrapper);
    chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll to bottom
}

// Function to handle the AI form submission
async function askLegalEagle() {
    const question = questionInput.value.trim();
    if (!question) return;

    // 1. Show user question immediately
    appendChatBubble('user', question);
    questionInput.value = ''; // Clear input
    
    // Disable input while waiting
    submitBtn.disabled = true;
    questionInput.disabled = true;

    try {
        const response = await fetch('/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: question })
        });

        if (!response.ok) throw new Error(`HTTP error ${response.status}`);

        // 2. We use marked.js to convert Markdown to HTML so tables/bold text format properly
        const markdownText = await response.text();
        const htmlContent = marked.parse(markdownText); 

        // 3. Display the AI response
        appendChatBubble('ai', htmlContent);

    } catch (error) {
        console.error("Error:", error);
        appendChatBubble('ai', "<p class='text-red-500'>عذراً، حدث خطأ في النظام. الرجاء المحاولة مرة أخرى.</p>");
    } finally {
        // Re-enable input
        submitBtn.disabled = false;
        questionInput.disabled = false;
        questionInput.focus();
    }
}

// Trigger on Button Click
submitBtn.addEventListener('click', askLegalEagle);

// Trigger on 'Enter' Key Press
questionInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        askLegalEagle();
    }
});