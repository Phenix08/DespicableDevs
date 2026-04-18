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
        const saved = localStorage.getItem(key);

        if (saved) {
            btn.innerHTML = "★★★★★".slice(0, saved) + "☆☆☆☆☆".slice(saved);
        } else {
            btn.innerText = "Add review";
        }

        // FLEX layout
        titleDiv.style.display = "flex";
        titleDiv.style.alignItems = "center";

        // 👉 THIS is the key line
        btn.style.marginLeft = "auto";

        btn.onclick = () => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, 5);
            }
            btn.remove();
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
        const saved = localStorage.getItem(key);

        const td = document.createElement("td");
        td.className = "text-center my-ocena-cell";

        if (saved) {
            td.innerHTML = "★★★★★".slice(0, saved) + "☆☆☆☆☆".slice(saved);
        } else {
            const btn = document.createElement("button");
            btn.className = "btn btn-action";
            btn.innerText = "Add review";

            btn.onclick = () => {
                localStorage.setItem(key, 5);
                td.innerHTML = "★★★★★";
            };

            td.appendChild(btn);
        }

        // 👉 insert at same position as header (index 4)
        row.insertBefore(td, row.children[4]);
    });
}

injectRatingsTable();
setInterval(injectRatingsTable, 2000);