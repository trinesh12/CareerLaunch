document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("resumeForm");
    const preview = document.getElementById("resumePreview");
    const generateButton = document.getElementById("generateButton");
    const downloadButton = document.getElementById("downloadButton");
    const latexOutput = document.getElementById("latexOutput");
    const submittedPreview = document.getElementById("submittedPreview");

    if (!form || !preview) {
        return;
    }

    const fields = {
        name: document.getElementById("nameInput"),
        title: document.getElementById("titleInput"),
        location: document.getElementById("locationInput"),
        email: document.getElementById("emailInput"),
        phone: document.getElementById("phoneInput"),
        linkedin: document.getElementById("linkedinInput"),
        github: document.getElementById("githubInput"),
        portfolio: document.getElementById("portfolioInput"),
        summary: document.getElementById("summaryInput"),
        education: document.getElementById("educationInput"),
        experience: document.getElementById("experienceInput"),
        projects: document.getElementById("projectsInput"),
        skills: document.getElementById("skillsInput"),
        certifications: document.getElementById("certificationsInput"),
        achievements: document.getElementById("achievementsInput")
    };

    const getValue = (field) => {
        return field ? field.value.trim() : "";
    };

    const escapeHtml = (value) => {
        const div = document.createElement("div");
        div.textContent = value;
        return div.innerHTML;
    };

    const escapeLatex = (value) => {
        return value
            .replace(/\\/g, "\\textbackslash{}")
            .replace(/&/g, "\\&")
            .replace(/%/g, "\\%")
            .replace(/\$/g, "\\$")
            .replace(/#/g, "\\#")
            .replace(/_/g, "\\_")
            .replace(/{/g, "\\{")
            .replace(/}/g, "\\}")
            .replace(/~/g, "\\textasciitilde{}")
            .replace(/\^/g, "\\textasciicircum{}");
    };

    const splitLines = (value) => {
        return value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    };

    const splitCommaItems = (value) => {
        return value.split(",").map((item) => item.trim()).filter(Boolean);
    };

    const normalizeUrl = (value) => {
        if (!value) {
            return "";
        }

        return /^https?:\/\//i.test(value) ? value : `https://${value}`;
    };

    const getLinkLabel = (value, type) => {
        if (!value) {
            return "";
        }

        const withoutProtocol = value.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
        const clean = withoutProtocol.replace(/\/$/, "");
        const parts = clean.split("/");

        if ((type === "linkedin" || type === "github") && parts.length > 1) {
            const username = parts[parts.length - 1] || clean;

            if (type === "linkedin") {
                return username.replace(/-[a-z0-9]{8,}$/i, "");
            }

            return username;
        }

        if (type === "portfolio") {
            return clean
                .split("/")[0]
                .replace(/\.[a-z]{2,}(\.[a-z]{2,})?$/i, "")
                .split(".")[0]
                .split("-")
                .filter(Boolean)
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
        }

        return clean;
    };

    const parsePipeRows = (value, keys) => {
        return splitLines(value).map((line) => {
            const parts = line.split("|").map((part) => part.trim());
            return keys.reduce((row, key, index) => {
                row[key] = parts[index] || "";
                return row;
            }, {});
        });
    };

    const getResumeData = () => {
        return {
            name: getValue(fields.name),
            title: getValue(fields.title),
            location: getValue(fields.location),
            email: getValue(fields.email),
            phone: getValue(fields.phone),
            linkedin: getValue(fields.linkedin),
            github: getValue(fields.github),
            portfolio: getValue(fields.portfolio),
            summary: getValue(fields.summary),
            education: parsePipeRows(getValue(fields.education), ["degree", "school", "dates", "details"]),
            experience: parsePipeRows(getValue(fields.experience), ["role", "company", "dates", "details"]),
            projects: parsePipeRows(getValue(fields.projects), ["name", "tech", "details"]),
            skills: splitCommaItems(getValue(fields.skills)),
            certifications: splitLines(getValue(fields.certifications)),
            achievements: splitLines(getValue(fields.achievements))
        };
    };

    const hasResumeData = (resume) => {
        return Object.keys(resume).some((key) => {
            const value = resume[key];
            return Array.isArray(value) ? value.length > 0 : Boolean(value);
        });
    };

    const latexList = (items) => {
        if (!items.length) {
            return "";
        }

        return [
            "\\begin{itemize}",
            ...items.map((item) => `  \\item ${escapeLatex(item)}`),
            "\\end{itemize}"
        ].join("\n");
    };

    const buildLatex = (resume) => {
        const contact = [resume.location, resume.email, resume.phone, resume.linkedin, resume.github, resume.portfolio]
            .filter(Boolean)
            .map(escapeLatex)
            .join(" $\\vert$ ");

        const education = resume.education.map((item) => [
            `\\resumeSubheading{${escapeLatex(item.degree)}}{${escapeLatex(item.dates)}}`,
            `{${escapeLatex(item.school)}}{${escapeLatex(item.details)}}`
        ].join("\n")).join("\n");

        const experience = resume.experience.map((item) => [
            `\\resumeSubheading{${escapeLatex(item.role)}}{${escapeLatex(item.dates)}}`,
            `{${escapeLatex(item.company)}}{}`,
            latexList(splitCommaItems(item.details))
        ].join("\n")).join("\n");

        const projects = resume.projects.map((item) => [
            `\\resumeProjectHeading{${escapeLatex(item.name)}}{${escapeLatex(item.tech)}}`,
            latexList(splitCommaItems(item.details))
        ].join("\n")).join("\n");

        return [
            "\\documentclass[letterpaper,11pt]{article}",
            "\\usepackage[empty]{fullpage}",
            "\\usepackage{titlesec}",
            "\\usepackage{enumitem}",
            String.raw`\newcommand{\resumeSubheading}[4]{\textbf{#1} \hfill #2\\\textit{#3} \hfill \textit{#4}}`,
            String.raw`\newcommand{\resumeProjectHeading}[2]{\textbf{#1} \hfill \textit{#2}}`,
            "\\begin{document}",
            "\\begin{center}",
            `  {\\Huge \\textbf{${escapeLatex(resume.name || "Your Name")}}} \\\\`,
            resume.title ? `  ${escapeLatex(resume.title)} \\\\` : "",
            contact ? `  ${contact}` : "",
            "\\end{center}",
            resume.summary ? `\\section*{Summary}\n${escapeLatex(resume.summary)}` : "",
            education ? `\\section*{Education}\n${education}` : "",
            experience ? `\\section*{Experience}\n${experience}` : "",
            projects ? `\\section*{Projects}\n${projects}` : "",
            resume.skills.length ? `\\section*{Technical Skills}\n${escapeLatex(resume.skills.join(", "))}` : "",
            resume.certifications.length ? `\\section*{Certifications}\n${latexList(resume.certifications)}` : "",
            resume.achievements.length ? `\\section*{Achievements}\n${latexList(resume.achievements)}` : "",
            "\\end{document}"
        ].filter(Boolean).join("\n\n");
    };

    const renderSection = (title, content) => {
        if (!content) {
            return "";
        }

        return `<section class="resume-section"><h4>${title}</h4>${content}</section>`;
    };

    const renderList = (items) => {
        if (!items.length) {
            return "";
        }

        return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
    };

    const renderEntryList = (entries, type) => {
        return entries.map((entry) => {
            if (type === "education") {
                return `
                    <div class="resume-entry">
                        <div class="entry-topline">
                            <strong>${escapeHtml(entry.degree)}</strong>
                            <span>${escapeHtml(entry.dates)}</span>
                        </div>
                        <div class="entry-subline">
                            <span>${escapeHtml(entry.school)}</span>
                            <span>${escapeHtml(entry.details)}</span>
                        </div>
                    </div>
                `;
            }

            if (type === "project") {
                return `
                    <div class="resume-entry">
                        <div class="entry-topline">
                            <strong>${escapeHtml(entry.name)}</strong>
                            <span>${escapeHtml(entry.tech)}</span>
                        </div>
                        ${renderList(splitCommaItems(entry.details))}
                    </div>
                `;
            }

            return `
                <div class="resume-entry">
                    <div class="entry-topline">
                        <strong>${escapeHtml(entry.role)}</strong>
                        <span>${escapeHtml(entry.dates)}</span>
                    </div>
                    <div class="entry-subline">${escapeHtml(entry.company)}</div>
                    ${renderList(splitCommaItems(entry.details))}
                </div>
            `;
        }).join("");
    };

    const renderPreview = (resume) => {
        if (!hasResumeData(resume)) {
            preview.classList.add("text-muted");
            preview.innerHTML = "<p class=\"mb-0\">Enter your details to generate the LaTeX resume preview.</p>";
            if (latexOutput) {
                latexOutput.value = "";
            }
            return false;
        }

        const latex = buildLatex(resume);
        const contactItems = [
            resume.location ? escapeHtml(resume.location) : "",
            resume.email ? `<a href="mailto:${escapeHtml(resume.email)}">${escapeHtml(resume.email)}</a>` : "",
            resume.phone ? `<a href="tel:${escapeHtml(resume.phone)}">${escapeHtml(resume.phone)}</a>` : "",
            resume.linkedin ? `<a href="${escapeHtml(normalizeUrl(resume.linkedin))}" target="_blank" rel="noopener noreferrer">${escapeHtml(getLinkLabel(resume.linkedin, "linkedin"))}</a>` : "",
            resume.github ? `<a href="${escapeHtml(normalizeUrl(resume.github))}" target="_blank" rel="noopener noreferrer">${escapeHtml(getLinkLabel(resume.github, "github"))}</a>` : "",
            resume.portfolio ? `<a href="${escapeHtml(normalizeUrl(resume.portfolio))}" target="_blank" rel="noopener noreferrer">${escapeHtml(getLinkLabel(resume.portfolio, "portfolio"))}</a>` : ""
        ].filter(Boolean);

        const contact = contactItems.join(" | ");

        preview.classList.remove("text-muted");
        preview.innerHTML = `
            <article class="latex-resume">
                <header class="latex-resume-header">
                    <h3>${escapeHtml(resume.name || "Your Name")}</h3>
                    ${resume.title ? `<p class="resume-title">${escapeHtml(resume.title)}</p>` : ""}
                    ${contact ? `<p class="resume-contact">${contact}</p>` : ""}
                </header>
                ${renderSection("Summary", resume.summary ? `<p>${escapeHtml(resume.summary)}</p>` : "")}
                ${renderSection("Education", renderEntryList(resume.education, "education"))}
                ${renderSection("Experience", renderEntryList(resume.experience, "experience"))}
                ${renderSection("Projects", renderEntryList(resume.projects, "project"))}
                ${renderSection("Technical Skills", resume.skills.length ? `<p>${resume.skills.map(escapeHtml).join(", ")}</p>` : "")}
                ${renderSection("Certifications", renderList(resume.certifications))}
                ${renderSection("Achievements", renderList(resume.achievements))}
            </article>
        `;

        if (latexOutput) {
            latexOutput.value = latex;
        }

        if (submittedPreview) {
            const firstProject = resume.projects[0]?.name || "Portfolio Website";
            submittedPreview.innerHTML = `
                <h3>Submitted Preview</h3>
                <p><strong>Name:</strong> ${escapeHtml(resume.name || "Trinesh")}</p>
                <p><strong>Skills:</strong> ${escapeHtml(resume.skills.join(", ") || "C++, Python")}</p>
                <p><strong>Projects:</strong> ${escapeHtml(firstProject)}</p>
            `;
        }

        return true;
    };

    const buildResume = () => {
        return renderPreview(getResumeData());
    };

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        buildResume();
    });

    if (generateButton) {
        generateButton.addEventListener("click", buildResume);
    }

    Object.keys(fields).forEach((key) => {
        if (fields[key]) {
            fields[key].addEventListener("input", buildResume);
        }
    });

    if (downloadButton) {
        downloadButton.addEventListener("click", () => {
            if (buildResume()) {
                window.print();
            }
        });
    }
});
