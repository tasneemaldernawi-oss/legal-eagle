const questionInput = document.getElementById('questionInput');
const submitBtn = document.getElementById('submitBtn');
const answerArea = document.getElementById('answerArea');

submitBtn.addEventListener('click', async () => {
    const question = questionInput.value;
    answerArea.innerHTML = ''; // Clear previous answer

    if (question.trim() !== '') {
        try {
            const response = await fetch('/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question: question })
            });

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            const html = await response.text();
            //const html = marked.parse(markdown); // Parse Markdown *first*

            let i = 0;
            const typingInterval = setInterval(() => {
                if (i < html.length) {
                    answerArea.innerHTML += html.charAt(i);
                    i++;
                } else {
                    clearInterval(typingInterval);
                }
            }, 30); 

        } catch (error) {
            console.error("Error:", error);
            answerArea.innerHTML = "<p>Error: Could not process your request.</p>";
        }
    } else {
        answerArea.innerHTML = "<p>Please enter a question!</p>";
    }
});

