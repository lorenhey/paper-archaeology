/**
 * PAPER ARCHAEOLOGY - Main Application Controller
 * v2.0.0
 */

(function () {
    let corpusData = { works: [], relationships: [] };
    let graph = null;
    let selectedWork = null;
    let activeFilters = {
        search: "",
        yearFrom: null,
        yearTo: null,
        workType: "ALL"
    };

    // DOM Elements
    const elements = {
        metricTotalWorks: document.getElementById('metric-total-works'),
        metricTotalLinks: document.getElementById('metric-total-links'),
        metricRootWorks: document.getElementById('metric-root-works'),
        metricYearSpan: document.getElementById('metric-year-span'),

        searchInput: document.getElementById('search-input'),
        filterYearFrom: document.getElementById('filter-year-from'),
        filterYearTo: document.getElementById('filter-year-to'),
        filterWorkType: document.getElementById('filter-work-type'),
        resetFiltersBtn: document.getElementById('reset-filters-btn'),

        corpusTableBody: document.getElementById('corpus-table-body'),
        filteredCountBadge: document.getElementById('filtered-count-badge'),

        // Inspector
        inspectorEmptyState: document.getElementById('inspector-empty-state'),
        inspectorContent: document.getElementById('inspector-content'),
        workDetailTitle: document.getElementById('work-detail-title'),
        workDetailAuthors: document.getElementById('work-detail-authors'),
        workDetailYear: document.getElementById('work-detail-year'),
        workDetailTypeBadge: document.getElementById('work-detail-type-badge'),
        workDetailSubject: document.getElementById('work-detail-subject'),

        frbrTreeContainer: document.getElementById('frbr-tree-container'),
        precursorsListContainer: document.getElementById('precursors-list-container'),
        descendantsListContainer: document.getElementById('descendants-list-container'),

        pathfinderTargetSelect: document.getElementById('pathfinder-target-select'),
        pathfinderRunBtn: document.getElementById('pathfinder-run-btn'),
        pathResultBox: document.getElementById('path-result-box'),

        markdownDossierCode: document.getElementById('markdown-dossier-code'),
        jsonDossierCode: document.getElementById('json-dossier-code'),

        copyDossierBtn: document.getElementById('copy-dossier-btn'),
        downloadDossierBtn: document.getElementById('download-dossier-btn'),
        exportCorpusBtn: document.getElementById('export-corpus-btn'),

        // Simulator
        simulatorForm: document.getElementById('simulator-form'),
        simTitleInput: document.getElementById('sim-title-input'),
        simAuthorInput: document.getElementById('sim-author-input'),
        simYearInput: document.getElementById('sim-year-input'),
        simSubjectInput: document.getElementById('sim-subject-input'),
        simTypeSelect: document.getElementById('sim-type-select'),
        simCiteTargetSelect: document.getElementById('sim-cite-target-select')
    };

    function init() {
        if (window.ARCHAEOLOGY_CORPUS) {
            corpusData = window.ARCHAEOLOGY_CORPUS;
            setup();
        } else {
            fetch('data/corpus_bundle.json')
                .then(res => res.json())
                .then(data => {
                    corpusData = data;
                    setup();
                })
                .catch(err => {
                    console.error("Could not load corpus bundle:", err);
                    setup();
                });
        }
    }

    function setup() {
        graph = ArchaeologyEngine.buildGraph(corpusData.works, corpusData.relationships);
        updateMetrics();
        populateDropdowns();
        bindEvents();
        renderTable();

        if (corpusData.works.length > 0) {
            selectWork(corpusData.works[0]);
        }
    }

    function updateMetrics() {
        const metrics = ArchaeologyEngine.computeNetworkMetrics(graph, corpusData.works);
        if (elements.metricTotalWorks) elements.metricTotalWorks.textContent = metrics.totalWorks;
        if (elements.metricTotalLinks) elements.metricTotalLinks.textContent = metrics.totalEdges;
        if (elements.metricRootWorks) elements.metricRootWorks.textContent = metrics.rootWorks.length;

        const years = corpusData.works.map(w => w.year).filter(y => Number.isFinite(y));
        if (years.length > 0 && elements.metricYearSpan) {
            const minYear = Math.min(...years);
            const maxYear = Math.max(...years);
            elements.metricYearSpan.textContent = `${minYear} - ${maxYear}`;
        }
    }

    function populateDropdowns() {
        // Pathfinder target select
        if (elements.pathfinderTargetSelect) {
            elements.pathfinderTargetSelect.innerHTML = '<option value="">-- Seleccionar obra de destino --</option>';
            corpusData.works.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.id;
                opt.textContent = `[${w.year || "S/D"}] ${w.title.substring(0, 48)}...`;
                elements.pathfinderTargetSelect.appendChild(opt);
            });
        }

        // Simulator cite target select
        if (elements.simCiteTargetSelect) {
            elements.simCiteTargetSelect.innerHTML = '<option value="">-- Ninguna (obra raíz / independiente) --</option>';
            corpusData.works.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.id;
                opt.textContent = `[${w.year || "S/D"}] ${w.title.substring(0, 48)}...`;
                elements.simCiteTargetSelect.appendChild(opt);
            });
        }
    }

    function renderTable() {
        const filtered = ArchaeologyEngine.filterCorpus(corpusData.works, activeFilters);
        if (elements.filteredCountBadge) {
            elements.filteredCountBadge.textContent = `${filtered.length} / ${corpusData.works.length}`;
        }

        elements.corpusTableBody.innerHTML = '';

        if (filtered.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                No se encontraron obras con los filtros aplicados.
            </td>`;
            elements.corpusTableBody.appendChild(tr);
            return;
        }

        filtered.forEach(item => {
            const tr = document.createElement('tr');
            if (selectedWork && (selectedWork.id === item.id)) {
                tr.classList.add('active-row');
            }

            const authors = (item.authors || []).map(a => a.name).join(", ") || "Anónimo";
            const yearStr = item.year || "S/D";
            const inDeg = (graph.adjReverse.get(item.id) || []).length;
            const outDeg = (graph.adjForward.get(item.id) || []).length;

            tr.innerHTML = `
                <td class="work-title-cell">${escapeHtml(item.title)}</td>
                <td class="work-author-cell">${escapeHtml(authors)}</td>
                <td style="font-family: var(--font-mono);">${yearStr}</td>
                <td>
                    <span class="badge badge-cyan" title="${outDeg} citas a precursores / ${inDeg} citas recibidas">
                        ↑${outDeg} ↓${inDeg}
                    </span>
                </td>
            `;

            tr.addEventListener('click', () => {
                selectWork(item);
                document.querySelectorAll('#corpus-table-body tr').forEach(r => r.classList.remove('active-row'));
                tr.classList.add('active-row');
            });

            elements.corpusTableBody.appendChild(tr);
        });
    }

    function selectWork(work) {
        if (!work) return;
        selectedWork = work;

        if (elements.inspectorEmptyState) elements.inspectorEmptyState.style.display = 'none';
        if (elements.inspectorContent) elements.inspectorContent.style.display = 'flex';

        elements.workDetailTitle.textContent = work.title;
        const authors = (work.authors || []).map(a => a.name).join(", ") || "Anónimo";
        elements.workDetailAuthors.textContent = authors;
        elements.workDetailYear.textContent = work.year ? `${work.year} d.C.` : "Fecha no determinada";
        elements.workDetailTypeBadge.textContent = (work.work_type || "paper").toUpperCase();
        elements.workDetailSubject.textContent = work.subject || "Ciencias Generales";

        // FRBR Tree
        renderFrbrTree(work);

        // Precursors & Descendants
        renderGenealogies(work);

        // Reset pathfinder result
        if (elements.pathResultBox) {
            elements.pathResultBox.textContent = "Seleccioná una obra de destino para buscar la ruta intelectual más corta.";
        }

        // Dossiers
        const markdown = ArchaeologyEngine.generatePaperDossier(work, graph, graph.worksMap);
        elements.markdownDossierCode.textContent = markdown;
        elements.jsonDossierCode.textContent = JSON.stringify(work, null, 2);
    }

    function renderFrbrTree(work) {
        elements.frbrTreeContainer.innerHTML = '';

        const workNode = document.createElement('div');
        workNode.className = 'frbr-node';
        workNode.innerHTML = `
            <div class="frbr-label">1. FRBR WORK (Concepto Intelectual Abstracto)</div>
            <div class="frbr-content"><strong>${escapeHtml(work.title)}</strong> (${work.year || "S/D"})</div>
        `;
        elements.frbrTreeContainer.appendChild(workNode);

        const expressions = work.expressions || [];
        if (expressions.length > 0) {
            expressions.forEach((ex, idx) => {
                const exNode = document.createElement('div');
                exNode.className = 'frbr-node';
                exNode.style.marginLeft = '1rem';
                
                const pubs = ex.publications || [];
                const pubsHtml = pubs.map(p => `
                    <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;">
                        🏛️ <em>${escapeHtml(p.venue || "Publicación")}</em> (${p.year || "S/D"})
                        ${p.volume ? `Vol. ${escapeHtml(p.volume)}` : ''}
                        ${p.pages ? `pp. ${escapeHtml(p.pages)}` : ''}
                        ${p.doi ? `<span class="badge badge-dim">DOI: ${escapeHtml(p.doi)}</span>` : ''}
                    </div>
                `).join('');

                exNode.innerHTML = `
                    <div class="frbr-label">2. FRBR EXPRESSION #${idx + 1} [${escapeHtml(ex.language.toUpperCase())}]</div>
                    <div class="frbr-content">${escapeHtml(ex.title)} ${ex.is_translation ? '<span class="badge badge-amber">Traducción</span>' : '<span class="badge badge-emerald">Original</span>'}</div>
                    ${pubsHtml}
                `;
                elements.frbrTreeContainer.appendChild(exNode);
            });
        } else {
            const noEx = document.createElement('div');
            noEx.className = 'frbr-node';
            noEx.style.marginLeft = '1rem';
            noEx.innerHTML = `<div class="frbr-content" style="color: var(--text-dim);">Sin realizaciones de publicación registradas.</div>`;
            elements.frbrTreeContainer.appendChild(noEx);
        }
    }

    function renderGenealogies(work) {
        // Precursors
        const precursors = ArchaeologyEngine.getPrecursors(graph, work.id, 2);
        elements.precursorsListContainer.innerHTML = '';
        if (precursors.length > 0) {
            precursors.forEach(p => {
                const lag = ArchaeologyEngine.calculateCitationLag(work.year, p.year);
                const item = document.createElement('div');
                item.className = 'genealogy-item';
                item.innerHTML = `
                    <div class="genealogy-item-header">
                        <span>${escapeHtml(p.title)}</span>
                        <span class="badge badge-cyan">${p.year || "S/D"}</span>
                    </div>
                    <div class="genealogy-item-body">
                        <span>Vínculo: <strong>${escapeHtml(p.relationshipType)}</strong></span>
                        <span>•</span>
                        <span>Salto temporal: <strong>${lag.lagYears !== null ? `${lag.lagYears} años` : "S/D"}</strong></span>
                        <span>•</span>
                        <span style="color: var(--accent-amber);">${escapeHtml(lag.label)}</span>
                    </div>
                `;
                item.addEventListener('click', () => {
                    const target = graph.worksMap.get(p.id);
                    if (target) selectWork(target);
                });
                elements.precursorsListContainer.appendChild(item);
            });
        } else {
            elements.precursorsListContainer.innerHTML = `<div style="color: var(--text-dim); font-size: 0.8rem; padding: 0.5rem 0;">No se registran precursores citados en este corpus (obra de partida).</div>`;
        }

        // Descendants
        const descendants = ArchaeologyEngine.getDescendants(graph, work.id, 2);
        elements.descendantsListContainer.innerHTML = '';
        if (descendants.length > 0) {
            descendants.forEach(d => {
                const lag = ArchaeologyEngine.calculateCitationLag(d.year, work.year);
                const item = document.createElement('div');
                item.className = 'genealogy-item';
                item.innerHTML = `
                    <div class="genealogy-item-header">
                        <span>${escapeHtml(d.title)}</span>
                        <span class="badge badge-emerald">${d.year || "S/D"}</span>
                    </div>
                    <div class="genealogy-item-body">
                        <span>Vínculo: <strong>${escapeHtml(d.relationshipType)}</strong></span>
                        <span>•</span>
                        <span>Recepción: <strong>${lag.lagYears !== null ? `${lag.lagYears} años después` : "S/D"}</strong></span>
                    </div>
                `;
                item.addEventListener('click', () => {
                    const target = graph.worksMap.get(d.id);
                    if (target) selectWork(target);
                });
                elements.descendantsListContainer.appendChild(item);
            });
        } else {
            elements.descendantsListContainer.innerHTML = `<div style="color: var(--text-dim); font-size: 0.8rem; padding: 0.5rem 0;">No se registran obras descendientes en este corpus.</div>`;
        }
    }

    function bindEvents() {
        // Search
        elements.searchInput.addEventListener('input', (e) => {
            activeFilters.search = e.target.value;
            renderTable();
        });

        // Year from / to
        elements.filterYearFrom.addEventListener('input', (e) => {
            activeFilters.yearFrom = e.target.value ? Number(e.target.value) : null;
            renderTable();
        });
        elements.filterYearTo.addEventListener('input', (e) => {
            activeFilters.yearTo = e.target.value ? Number(e.target.value) : null;
            renderTable();
        });

        // Work Type
        elements.filterWorkType.addEventListener('change', (e) => {
            activeFilters.workType = e.target.value;
            renderTable();
        });

        // Reset
        elements.resetFiltersBtn.addEventListener('click', () => {
            activeFilters = { search: "", yearFrom: null, yearTo: null, workType: "ALL" };
            elements.searchInput.value = "";
            elements.filterYearFrom.value = "";
            elements.filterYearTo.value = "";
            elements.filterWorkType.value = "ALL";
            renderTable();
        });

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-tab');
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active-pane'));

                btn.classList.add('active-tab');
                const pane = document.getElementById(target);
                if (pane) pane.classList.add('active-pane');
            });
        });

        // Pathfinder
        elements.pathfinderRunBtn.addEventListener('click', () => {
            if (!selectedWork) return;
            const targetId = Number(elements.pathfinderTargetSelect.value);
            if (!targetId) {
                alert("Seleccioná una obra de destino.");
                return;
            }

            const path = ArchaeologyEngine.findShortestPath(graph, selectedWork.id, targetId, 'undirected');
            if (path.length > 0) {
                const hopsHtml = path.map(id => {
                    const w = graph.worksMap.get(id);
                    return `<strong>[${id}] ${escapeHtml(w.title.substring(0, 32))} (${w.year})</strong>`;
                }).join(' <span style="color: var(--accent-cyan); font-weight: bold;">➔</span> ');

                elements.pathResultBox.innerHTML = `
                    <div style="color: #fff; margin-bottom: 0.3rem;">Ruta localizada (${path.length - 1} saltos intelectuales):</div>
                    <div>${hopsHtml}</div>
                `;
            } else {
                elements.pathResultBox.innerHTML = `<span style="color: var(--accent-ruby);">No se encontró ningún camino de citación entre ambas obras en el subgrafo actual.</span>`;
            }
        });

        // Copy Dossier
        elements.copyDossierBtn.addEventListener('click', () => {
            if (!selectedWork) return;
            const md = ArchaeologyEngine.generatePaperDossier(selectedWork, graph, graph.worksMap);
            navigator.clipboard.writeText(md).then(() => {
                const orig = elements.copyDossierBtn.innerHTML;
                elements.copyDossierBtn.innerHTML = '✓ ¡Copiado!';
                setTimeout(() => { elements.copyDossierBtn.innerHTML = orig; }, 2000);
            });
        });

        // Download Markdown Dossier
        elements.downloadDossierBtn.addEventListener('click', () => {
            if (!selectedWork) return;
            const md = ArchaeologyEngine.generatePaperDossier(selectedWork, graph, graph.worksMap);
            const safeName = selectedWork.title.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase().substring(0, 30);
            downloadBlob(md, `paper_archaeology_${safeName}.md`, 'text/markdown;charset=utf-8;');
        });

        // Export Entire Corpus JSON
        elements.exportCorpusBtn.addEventListener('click', () => {
            const dataStr = JSON.stringify(corpusData, null, 2);
            downloadBlob(dataStr, 'paper_archaeology_corpus.json', 'application/json;charset=utf-8;');
        });

        // Simulator
        elements.simulatorForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = elements.simTitleInput.value.trim();
            const author = elements.simAuthorInput.value.trim();
            const year = elements.simYearInput.value ? Number(elements.simYearInput.value) : 1900;
            const subject = elements.simSubjectInput.value.trim();
            const type = elements.simTypeSelect.value;
            const citeTarget = elements.simCiteTargetSelect.value ? Number(elements.simCiteTargetSelect.value) : null;

            if (!title) {
                alert("Ingresá el título de la obra.");
                return;
            }

            const newId = Math.max(...corpusData.works.map(w => w.id), 0) + 1;
            const newWork = {
                id: newId,
                title,
                year,
                work_type: type,
                subject: subject || "Sin clasificar",
                authors: author ? [{ id: 999, name: author }] : [],
                expressions: [
                    {
                        id: 9000 + newId,
                        work_id: newId,
                        language: "en",
                        title: title,
                        is_translation: false,
                        publications: []
                    }
                ]
            };

            corpusData.works.push(newWork);

            if (citeTarget) {
                corpusData.relationships.push({
                    id: corpusData.relationships.length + 1,
                    source: newId,
                    target: citeTarget,
                    type: ArchaeologyEngine.RelationshipType.CITES,
                    confidence: 1.0,
                    evidence: "Simulador Arqueológico"
                });
            }

            // Rebuild graph and refresh
            graph = ArchaeologyEngine.buildGraph(corpusData.works, corpusData.relationships);
            updateMetrics();
            populateDropdowns();
            renderTable();
            selectWork(newWork);

            document.querySelector('.workspace-split').scrollIntoView({ behavior: 'smooth' });
        });
    }

    function downloadBlob(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
