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

function extractWebsiteStyles() {
    // Extract styles from the website to match its aesthetic
    const rootStyle = window.getComputedStyle(document.documentElement);

    const rootPrimary = rootStyle.getPropertyValue('--primary').trim();
    const rootText = rootStyle.getPropertyValue('--dark').trim() || rootStyle.getPropertyValue('--gray-dark').trim();
    const rootFont = rootStyle.getPropertyValue('--font-family-sans-serif').trim();
    const rootBackground = rootStyle.getPropertyValue('--light').trim();
    const rootBorder = rootStyle.getPropertyValue('--gray').trim();

    let primaryColor = rootPrimary || '#8BC832';
    let textColor = rootText || '#000000';
    let fontFamily = rootFont || 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    let backgroundColor = rootBackground || '#F0F3F5';
    let borderColor = rootBorder || '#dfe3e8';

    try {
        const bodyStyle = window.getComputedStyle(document.body);
        if (!rootText) textColor = bodyStyle.color || textColor;
        if (!rootFont) fontFamily = bodyStyle.fontFamily || fontFamily;

        const primaryBtn = document.querySelector('button, .btn-primary, [class*="primary"]');
        if (primaryBtn) {
            const btnColor = window.getComputedStyle(primaryBtn).backgroundColor;
            if (btnColor && btnColor !== 'rgba(0, 0, 0, 0)') {
                primaryColor = btnColor;
            }
        }

        const mainContent = document.querySelector('main, .container, [class*="content"]');
        if (mainContent) {
            const bg = window.getComputedStyle(mainContent).backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)') {
                backgroundColor = bg;
            }
        }

        const commonElement = document.querySelector('input, textarea, select, [class*="border"]');
        if (commonElement) {
            const border = window.getComputedStyle(commonElement).borderColor;
            if (border && border !== 'rgba(0, 0, 0, 0)') {
                borderColor = border;
            }
        }
    } catch (e) {
        console.log('Could not extract all styles, using defaults');
    }

    return {
        primaryColor,
        textColor,
        fontFamily,
        backgroundColor,
        borderColor
    };
}

function showReviewModal() {
    // Remove existing modal if present
    const existingModal = document.getElementById('review-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    // Extract website styles
    const websiteStyles = extractWebsiteStyles();

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
        :root {
            --primary-color: ${websiteStyles.primaryColor};
            --text-color: ${websiteStyles.textColor};
            --font-family: ${websiteStyles.fontFamily};
            --background-color: ${websiteStyles.backgroundColor};
            --surface-color: #ffffff;
            --border-color: ${websiteStyles.borderColor};
            --muted-color: rgba(0, 0, 0, 0.6);
            --overlay-color: rgba(0, 0, 0, 0.35);
        }

        #review-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: var(--overlay-color);
            z-index: 10000;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding-top: 10.5rem;
        }

        #review-modal {
            background: var(--surface-color);
            border-radius: 1rem;
            width: min(92%, 560px);
            max-height: calc(100vh - 12rem);
            overflow-y: auto;
            box-shadow: 0 18px 60px rgba(0, 0, 0, 0.16);
            font-family: var(--font-family);
            color: var(--text-color);
            border: 1px solid rgba(0, 0, 0, 0.05);
        }

        #review-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem 1.5rem 1rem;
            border-bottom: 1px solid var(--border-color);
            background-color: #f8fafb;
            border-top-left-radius: 1rem;
            border-top-right-radius: 1rem;
        }

        #review-modal-header h2 {
            margin: 0;
            font-size: 1.1rem;
            letter-spacing: 0.01em;
            color: var(--text-color);
            font-weight: 500;
        }

        #review-modal-close {
            background: none;
            border: none;
            font-size: 1.9rem;
            cursor: pointer;
            color: var(--text-color);
            padding: 0;
            line-height: 1;
            width: 2rem;
            height: 2rem;
            display: grid;
            place-items: center;
        }

        #review-modal-close:hover {
            opacity: 0.75;
        }

        #review-modal-content {
            padding: 1.5rem;
        }

        .stars {
            font-size: 1.4rem;
            color: #d6b500;
            margin-bottom: 0.35rem;
            letter-spacing: 0.05em;
        }

        .review-count {
            font-size: 0.95rem;
            color: var(--muted-color);
            margin-bottom: 1.5rem;
        }

        .rating-bars {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .rating-bar {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }

        .bar-label {
            font-size: 0.78rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-color);
        }

        .bar {
            height: 0.55rem;
            background-color: var(--border-color);
            border-radius: 999px;
            overflow: hidden;
        }

        .bar-fill {
            height: 100%;
            background-color: var(--primary-color);
            transition: width 0.3s ease;
        }

        .comments-section {
            border-top: 1px solid rgba(0, 0, 0, 0.08);
            padding-top: 1.2rem;
        }

        .comments-title {
            font-size: 1rem;
            margin-bottom: 0.85rem;
            font-weight: 700;
            color: var(--text-color);
        }

        .comment {
            font-size: 0.95rem;
            margin-bottom: 0.85rem;
            padding: 1rem;
            background-color: #f7f9fb;
            border-radius: 0.85rem;
            border-left: 4px solid var(--primary-color);
            color: var(--text-color);
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
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