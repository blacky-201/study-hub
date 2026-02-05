document.addEventListener("DOMContentLoaded", () => {
    /* ================== DOM REFERENCES ================== */

  const subjectsEl = document.getElementById("subjects");
  const chaptersEl = document.getElementById("chapters");
  const completedEl = document.getElementById("completed");
  const rateEl = document.getElementById("rate");
  const progress = document.getElementById("progress");
  const progressText = document.getElementById("progress-text");

  const pdfFrame = document.getElementById("pdfFrame");
  const pdfBreadcrumb = document.getElementById("pdfBreadcrumb");
  const aiPanel = document.getElementById("aiPanel");

  const subjectName = document.getElementById("subjectName");
  const subjectChapters = document.getElementById("subjectChapters");


  /* ================== DATA ================== */

  let subjects = JSON.parse(localStorage.getItem("subjects")) || [];
     window.goToDashboard = function () {
  // Close PDF only
  if (typeof closePDF === "function") {
    closePDF();
  }

  // Scroll dashboard to top
  const main = document.querySelector(".main");
  if (main) {
    main.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }
};

  // migrate old format
  subjects = subjects.map(s => {
    if (typeof s.chapters === "number") {
      const chapters = [];
      for (let i = 1; i <= s.chapters; i++) {
        chapters.push({ title: `Chapter ${i}`, done: false, pdf: null });
      }
      return { name: s.name, chapters };
    }
    return s;
  });

 window.toggleTheme = function () {
  document.body.classList.toggle("light");
};

  /* ================== HELPERS ================== */

  function save() {
    localStorage.setItem("subjects", JSON.stringify(subjects));
  }

  function render() {
    renderSubjects();
    updateStats();
  }

  /* ================== MODAL ================== */

  window.openModal = function () {
    document.getElementById("subjectModal").classList.add("show");
  };

  window.closeModal = function () {
    document.getElementById("subjectModal").classList.remove("show");
  };

  /* ================== SUBJECTS ================== */

  window.addSubject = function () {
    const name = subjectName.value.trim();
    const count = parseInt(subjectChapters.value);

    if (!name || count <= 0) {
      alert("Enter valid subject details");
      return;
    }

    const chapters = [];
    for (let i = 1; i <= count; i++) {
      chapters.push({ title: `Chapter ${i}`, done: false, pdf: null });
    }

    subjects.push({ name, chapters });
    save();
    render();
    closeModal();

    subjectName.value = "";
    subjectChapters.value = "";
  };

  window.editSubject = function (i) {
    const n = prompt("Edit subject name", subjects[i].name);
    if (!n) return;
    subjects[i].name = n.trim();
    save();
    render();
  };

  window.deleteSubject = function (i) {
    if (!confirm("Delete this subject?")) return;
    subjects.splice(i, 1);
    save();
    render();
  };

  /* ================== CHAPTERS ================== */

 window.toggleChapter = function (sIndex, cIndex) {
  subjects[sIndex].chapters[cIndex].done =
    !subjects[sIndex].chapters[cIndex].done;

  save();
  render(); // 🔥 REQUIRED
};


  window.editChapter = function (si, ci) {
    const c = subjects[si].chapters[ci];
    const t = prompt("Edit chapter title", c.title);
    if (!t) return;
    c.title = t.trim();
    save();
    render();
  };

  window.deleteChapter = function (si, ci) {
    if (!confirm("Delete this chapter?")) return;

    subjects[si].chapters.splice(ci, 1);
    if (subjects[si].chapters.length === 0) {
      subjects.splice(si, 1);
    }

    save();
    render();
  };

  /* ================== PDF ================== */

  window.uploadPDF = async function (si, ci, input) {
  const file = input.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("pdf", file);

  try {
    const res = await fetch("http://localhost:3000/api/upload-pdf", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (!data.success) {
      alert("Upload failed");
      return;
    }

    // ✅ Store URL instead of Base64
    subjects[si].chapters[ci].pdf = data.url;
    save();
    render();

  } catch (err) {
    alert("Server error while uploading PDF");
    console.error(err);
  }
};

window.openPDF = function (sIndex, cIndex) {
  const chapter = subjects[sIndex].chapters[cIndex];

  document.body.classList.add("pdf-mode");

  document.getElementById("pdfFrame").src = chapter.pdf;
};

window.closePDF = function () {
  document.body.classList.remove("pdf-mode");
  document.body.classList.remove("sidebar-open");
  document.getElementById("pdfFrame").src = "";
};

document.querySelector(".main").addEventListener("click", () => {
  if (document.body.classList.contains("pdf-mode")) {
    document.body.classList.remove("sidebar-open");
  }
});

 /* ================== AI ================== */

window.toggleAI = function () {
  const ai = document.getElementById("aiPanel");
  ai.classList.toggle("open");

  // Track AI state on body
  document.body.classList.toggle("ai-open", ai.classList.contains("open"));
};


const aiInput = document.querySelector(".ai-panel-input");
const aiBody = document.querySelector(".ai-panel-body");

document.querySelector(".ai-send-btn").onclick = sendAI;
aiInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendAI();
});

async function sendAI() {
  const text = aiInput.value.trim();
  if (!text) return;

  // User message
  aiBody.innerHTML += `
    <div class="ai-message ai-user">${text}</div>
  `;
  aiInput.value = "";

  // Bot placeholder
  const bot = document.createElement("div");
  bot.className = "ai-message ai-bot";
  bot.textContent = "Thinking...";
  aiBody.appendChild(bot);
  aiBody.scrollTop = aiBody.scrollHeight;

  try {
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();

   bot.innerHTML = (data.reply || "⚠️ No response from AI")
  .replace(/\n/g, "<br>");
    aiBody.scrollTop = aiBody.scrollHeight;

  } catch (err) {
    bot.textContent = "❌ AI server not reachable";
    console.error(err);
  }
}

  /* ================== RENDER ================== */

  function renderSubjects() {
    const panel = document.getElementById("subjectPanel");
    panel.innerHTML = `<h3>Subject Progress</h3>`;

    if (!subjects.length) {
      panel.innerHTML += `<p class="empty">No subjects yet.</p>`;
      return;
    }

    subjects.forEach((s, si) => {
      const done = s.chapters.filter(c => c.done).length;
      const percent = Math.round((done / s.chapters.length) * 100);

     panel.innerHTML += `
  <div class="subject">

    <!-- SUBJECT HEADER -->
    <div class="subject-header">
      <div class="subject-title">
        <strong>${s.name}</strong>
      </div>

      <div class="subject-actions">
        <button class="icon" onclick="editSubject(${si})">✏️</button>
        <button class="icon danger" onclick="deleteSubject(${si})">🗑</button>
      </div>
    </div>

    <!-- SUBJECT PROGRESS -->
    <div class="progress-bar">
      <div class="progress" style="width:${percent}%"></div>
    </div>

    <!-- CHAPTER LIST -->
    <div class="chapters">
      ${s.chapters.map((c, ci) => `
        <div class="chapter">

          <div class="chapter-header">
            <label class="chapter-title">
              <input type="checkbox"
                ${c.done ? "checked" : ""}
                onchange="toggleChapter(${si},${ci})">
              <span onclick="editChapter(${si},${ci})">${c.title}</span>
            </label>

            <div class="chapter-actions">
              ${c.pdf ? `
                <button class="open-pdf"
                  onclick="openPDF(${si},${ci})">
                  📄 Open
                </button>
              ` : ""}

              <button class="icon danger del-chapter"
                onclick="deleteChapter(${si},${ci})">
                🗑
              </button>
            </div>
          </div>

          <input type="file" accept="application/pdf"
            onchange="uploadPDF(${si},${ci},this)">
        </div>
      `).join("")}
    </div>

  </div>
`;

    });
  }

  function updateStats() {
  let totalSubjects = subjects.length;
  let totalChapters = 0;
  let completedChapters = 0;

  subjects.forEach(subject => {
    totalChapters += subject.chapters.length;
    completedChapters += subject.chapters.filter(c => c.done).length;
  });

  const rate = totalChapters === 0
    ? 0
    : Math.round((completedChapters / totalChapters) * 100);

  // Update numbers
  subjectsEl.innerText = totalSubjects;
  chaptersEl.innerText = totalChapters;
  completedEl.innerText = completedChapters;
  rateEl.innerText = rate + "%";

  // ✅ UPDATE OVERALL PROGRESS BAR
  progress.style.width = rate + "%";
  progressText.innerText =
    `${completedChapters} of ${totalChapters} chapters completed`;
}


  /* ================== INIT ================== */

  render();
});
/*============hamburger=====*/

window.toggleSidebar = function () {
  document.body.classList.toggle("sidebar-open");
  console.log("sidebar-open:", document.body.classList.contains("sidebar-open"));
};
