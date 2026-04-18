function injectButton() {
    console.log("BANANA");

    const dodajButtons = document.querySelectorAll('button[sifra-data]');

    dodajButtons.forEach(dodajBtn => {
        const container = dodajBtn.closest(".d-block");
        if (!container) return;

        // Prevent duplicates
        if (container.querySelector(".my-stars-div")) return;

        const wrapper = document.createElement("div");
        wrapper.className = "job-actions col-12 mb-1 ml-auto px-0 my-stars-div";

        const btn = document.createElement("button");
        btn.className = "btn btn-action ml-auto";
        btn.innerHTML = "★★★★★";
        btn.style.fontSize = "16px";

        btn.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            showReviewModal();
        };

        wrapper.appendChild(btn);

        const allJobsDiv = container.querySelector("a[href*='vsadelapodj']")?.closest(".job-actions");

        if (allJobsDiv) {
            allJobsDiv.insertAdjacentElement("afterend", wrapper);
        } else {
            container.appendChild(wrapper);
        }
    });
}

function showReviewModal() {
    // Remove existing modal if present
    const existingModal = document.getElementById('review-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'review-modal-overlay';
    modalOverlay.innerHTML = `
        <div id="review-modal">
            <div id="review-modal-header">
                <h2>Job Review</h2>
                <button id="review-modal-close">&times;</button>
            </div>
            <div id="review-modal-content">
                <div class="stars">★★★★★</div>
                <div class="review-count">Based on 42 reviews</div>

                <div class="rating-bars">
                    <div class="rating-bar">
                        <div class="bar-label">Location</div>
                        <div class="bar">
                            <div class="bar-fill" style="width: 85%;"></div>
                        </div>
                    </div>
                    <div class="rating-bar">
                        <div class="bar-label">Application Process</div>
                        <div class="bar">
                            <div class="bar-fill" style="width: 70%;"></div>
                        </div>
                    </div>
                    <div class="rating-bar">
                        <div class="bar-label">Team</div>
                        <div class="bar">
                            <div class="bar-fill" style="width: 90%;"></div>
                        </div>
                    </div>
                    <div class="rating-bar">
                        <div class="bar-label">Flexibility in Work Hours</div>
                        <div class="bar">
                            <div class="bar-fill" style="width: 75%;"></div>
                        </div>
                    </div>
                </div>

                <div class="comments-section">
                    <div class="comments-title">Comments</div>
                    <div class="comment">Great location and flexible hours!</div>
                    <div class="comment">The team is amazing and supportive.</div>
                    <div class="comment">Application process was straightforward.</div>
                </div>
            </div>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        #review-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding-top: 80px; /* Adjust this value to position below header */
        }

        #review-modal {
            background: white;
            border-radius: 8px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            font-family: Arial, sans-serif;
        }

        #review-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #eee;
        }

        #review-modal-header h2 {
            margin: 0;
            color: #333;
        }

        #review-modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #review-modal-close:hover {
            color: #333;
        }

        #review-modal-content {
            padding: 20px;
        }

        .stars {
            font-size: 24px;
            color: gold;
            margin-bottom: 5px;
        }

        .review-count {
            font-size: 14px;
            color: #666;
            margin-bottom: 20px;
        }

        .rating-bars {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }

        .rating-bar {
            display: flex;
            flex-direction: column;
        }

        .bar-label {
            font-size: 12px;
            margin-bottom: 5px;
            font-weight: bold;
        }

        .bar {
            height: 8px;
            background-color: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
        }

        .bar-fill {
            height: 100%;
            background-color: #4CAF50;
            transition: width 0.3s ease;
        }

        .comments-section {
            border-top: 1px solid #ccc;
            padding-top: 15px;
        }

        .comments-title {
            font-size: 16px;
            margin-bottom: 10px;
            font-weight: bold;
        }

        .comment {
            font-size: 14px;
            margin-bottom: 10px;
            padding: 8px;
            background-color: #f9f9f9;
            border-radius: 4px;
            border-left: 3px solid #4CAF50;
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(modalOverlay);

    // Add close functionality
    document.getElementById('review-modal-close').onclick = () => {
        modalOverlay.remove();
        style.remove();
    };

    // Close on overlay click
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
            style.remove();
        }
    };

    // Close on Escape key
    document.addEventListener('keydown', function closeOnEscape(e) {
        if (e.key === 'Escape') {
            modalOverlay.remove();
            style.remove();
            document.removeEventListener('keydown', closeOnEscape);
        }
    });
}

injectButton();
setInterval(injectButton, 2000);