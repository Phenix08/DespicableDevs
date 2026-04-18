function injectVerifiedReviewButtons() {

    if (!window.location.href.includes("/studenti/moje-izkusnje/")) {
    return;
    }

    console.log("BANANA (review)");

    const jobRows = document.querySelectorAll(".row.border-bottom");

    jobRows.forEach(row => {
        const titleDiv = row.querySelector(".col-12.h3");
        if (!titleDiv) return;

        // Prevent duplicates
        if (titleDiv.querySelector(".my-review-btn")) return;

        // Wrap text in span (important!)
        const text = titleDiv.firstChild.textContent.trim();
        titleDiv.innerHTML = ""; // clear

        const textSpan = document.createElement("span");
        textSpan.innerText = text;

        // Create button
        const btn = document.createElement("button");
        btn.className = "btn btn-action my-review-btn";

        const key = "review_" + text;
        const savedRaw = localStorage.getItem(key);
        const saved = savedRaw ? JSON.parse(savedRaw) : null;

        if (saved) {
            btn.innerHTML = "★★★★★".slice(0, saved.overall) + "☆☆☆☆☆".slice(saved.overall);
        } else {
            btn.innerText = "Add review";
        }

        // FLEX layout
        titleDiv.style.display = "flex";
        titleDiv.style.alignItems = "center";

        // 👉 THIS is the key line
        btn.style.marginLeft = "auto";

        btn.onclick = () => {
            event.preventDefault();
            event.stopPropagation();
            showAddReviewModal(text, (data) => {
                localStorage.setItem(key, JSON.stringify(data));
                btn.innerHTML = "★★★★★".slice(0, data.overall) + "☆☆☆☆☆".slice(data.overall);
            });
        };

        titleDiv.appendChild(textSpan);
        titleDiv.appendChild(btn);
    });
}

injectVerifiedReviewButtons();
setInterval(injectVerifiedReviewButtons, 2000);

function injectRatingsTable() {

    if (!window.location.href.includes("/studenti/izdane-napotnice/")) {
        return;
    }

    console.log("BANANA (table ratings)");

    const table = document.querySelector("table");
    if (!table) return;

    const theadRow = table.querySelector("thead tr");
    const tbodyRows = table.querySelectorAll("tbody tr");

    // ✅ Insert header at correct position
    if (!theadRow.querySelector(".my-ocena-header")) {
        const th = document.createElement("th");
        th.innerText = "Ocene";
        th.className = "bg-white text-center my-ocena-header";
        th.style.fontSize = "12px";

        // 👉 insert BEFORE "Veljavnost napotnice" (index 4)
        theadRow.insertBefore(th, theadRow.children[4]);
    }

    tbodyRows.forEach(row => {
        if (row.querySelector(".my-ocena-cell")) return;

        const companyCell = row.querySelector(".title");
        if (!companyCell) return;

        const company = companyCell.innerText.trim();
        const key = "review_" + company;
        const savedRaw = localStorage.getItem(key);
        const saved = savedRaw ? JSON.parse(savedRaw) : null;

        const td = document.createElement("td");
        td.className = "text-center my-ocena-cell";

        if (saved) {
            const btn = document.createElement("button");
            btn.className = "btn btn-action my-ocena-btn";

            const stars =
                "★★★★★".slice(0, saved.overall)

            btn.innerText = stars;

            btn.onclick = () => {
                event.preventDefault();
                event.stopPropagation();
                showAddReviewModal(company, (data) => {
                    localStorage.setItem(key, JSON.stringify(data));

                    btn.innerText =
                        "★★★★★".slice(0, data.overall)
                });
            };

            td.appendChild(btn);
        }

        // 👉 insert at same position as header (index 4)
        row.insertBefore(td, row.children[4]);
    });
}

injectRatingsTable();
setInterval(injectRatingsTable, 2000);

function showAddReviewModal(company, onSave) {

    const existing = document.getElementById("review-modal-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "review-modal-overlay";

    overlay.innerHTML = `
        <div id="review-modal">
            <div id="review-modal-header">
                <h2>Add Review (${company})</h2>
                <button id="close-review">&times;</button>
            </div>

            <div id="review-modal-content">

                <label>Overall Rating</label>
                <select id="overall-rating">
                    <option value="1">1 ⭐</option>
                    <option value="2">2 ⭐⭐</option>
                    <option value="3">3 ⭐⭐⭐</option>
                    <option value="4">4 ⭐⭐⭐⭐</option>
                    <option value="5" selected>5 ⭐⭐⭐⭐⭐</option>
                </select>

                <label>Work Environment</label>
                <select id="sub1">
                    <option value="1">1</option><option value="2">2</option>
                    <option value="3">3</option><option value="4">4</option>
                    <option value="5" selected>5</option>
                </select>

                <label>Flexibility</label>
                <select id="sub2">
                    <option value="1">1</option><option value="2">2</option>
                    <option value="3">3</option><option value="4">4</option>
                    <option value="5" selected>5</option>
                </select>

                <label>Team</label>
                <select id="sub3">
                    <option value="1">1</option><option value="2">2</option>
                    <option value="3">3</option><option value="4">4</option>
                    <option value="5" selected>5</option>
                </select>

                <button id="save-review" class="btn btn-primary mt-3">Save Review</button>
            </div>
        </div>
    `;

    const style = document.createElement("style");
    style.textContent = `
        #review-modal-overlay {
            position: fixed;
            top:0; left:0;
            width:100%; height:100%;
            background: rgba(0,0,0,0.5);
            display:flex;
            justify-content:center;
            align-items:center;
            z-index:10000;
        }
        #review-modal {
            background:white;
            padding:20px;
            border-radius:8px;
            width:300px;
        }
        #review-modal-content {
            display:flex;
            flex-direction:column;
            gap:10px;
        }
        select {
            padding:5px;
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);

    document.getElementById("close-review").onclick = () => {
        overlay.remove();
        style.remove();
    };

    document.getElementById("save-review").onclick = () => {
        const data = {
            overall: document.getElementById("overall-rating").value,
            sub1: document.getElementById("sub1").value,
            sub2: document.getElementById("sub2").value,
            sub3: document.getElementById("sub3").value
        };

        onSave(data);

        overlay.remove();
        style.remove();
    };
}