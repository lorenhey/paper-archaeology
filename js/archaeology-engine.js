/**
 * PAPER ARCHAEOLOGY - Intellectual Genealogy & Bibliographic Archaeology Engine
 * v2.0.0
 * 
 * Reconstructs the historical trajectory of scientific papers across editions,
 * languages, citations, and intellectual lineages.
 * 
 * Implements:
 *  - FRBR conceptual model (Work -> Expression -> Publication -> Digital Copy)
 *  - Directed Citation & Intellectual Genealogy Graph (Shortest Path, Precursors, Descendants)
 *  - Citation time-lag & dormancy/rediscovery analysis
 *  - Network centrality metrics (in-degree, out-degree, bridge works)
 *  - Provenance & Evidence tracking
 *  - Archival Markdown dossier generation
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ArchaeologyEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    const RelationshipType = {
        CITES: "cites",
        PRECURSOR_TO: "precursor_to",
        EXTENDS: "extends",
        CRITICIZES: "criticizes",
        CORRECTS: "corrects",
        GENERALIZES: "generalizes",
        REFORMULATES: "reformulates",
        TRANSLATION_OF: "translation_of",
        REPRINT_OF: "reprint_of"
    };

    const WorkType = {
        PAPER: "paper",
        BOOK: "book",
        PROCEEDINGS: "proceedings",
        LETTER: "letter",
        MEMOIR: "memoir",
        THESIS: "thesis",
        OTHER: "other"
    };

    /**
     * Builds directed citation graphs from works and relationships.
     * Edge A -> B means A cites/extends B.
     * Reverse edge B -> A means B is cited by A.
     */
    function buildGraph(works = [], relationships = []) {
        const worksMap = new Map();
        const adjForward = new Map(); // A -> [B1, B2...] (precursors of A)
        const adjReverse = new Map(); // B -> [A1, A2...] (descendants of B)
        const edgeMetadata = new Map();

        works.forEach(w => {
            const id = Number(w.id);
            worksMap.set(id, w);
            adjForward.set(id, []);
            adjReverse.set(id, []);
        });

        relationships.forEach(rel => {
            const src = Number(rel.source);
            const tgt = Number(rel.target);
            const type = rel.type || RelationshipType.CITES;

            if (worksMap.has(src) && worksMap.has(tgt)) {
                adjForward.get(src).push(tgt);
                adjReverse.get(tgt).push(src);

                const edgeKey = `${src}->${tgt}`;
                edgeMetadata.set(edgeKey, {
                    id: rel.id,
                    type: type,
                    confidence: rel.confidence !== undefined ? rel.confidence : 1.0,
                    evidence: rel.evidence || null
                });
            }
        });

        return {
            worksMap,
            adjForward,
            adjReverse,
            edgeMetadata,
            nodesCount: worksMap.size,
            edgesCount: relationships.length
        };
    }

    /**
     * Breadth-First Search to find the shortest citation path from source to target.
     * Can search in forward direction (citations), reverse direction, or undirected.
     * 
     * @param {Object} graph - Built by buildGraph
     * @param {number} sourceId
     * @param {number} targetId
     * @param {string} [direction="undirected"] - "forward", "reverse", or "undirected"
     * @returns {Array<number>} Array of node IDs representing the path, or [] if no path.
     */
    function findShortestPath(graph, sourceId, targetId, direction = "undirected") {
        const src = Number(sourceId);
        const tgt = Number(targetId);

        if (!graph.worksMap.has(src) || !graph.worksMap.has(tgt)) return [];
        if (src === tgt) return [src];

        const queue = [src];
        const visited = new Set([src]);
        const parent = new Map();

        while (queue.length > 0) {
            const current = queue.shift();
            if (current === tgt) {
                // Reconstruct path
                const path = [];
                let curr = tgt;
                while (curr !== undefined) {
                    path.unshift(curr);
                    curr = parent.get(curr);
                }
                return path;
            }

            let neighbors = [];
            if (direction === "forward") {
                neighbors = graph.adjForward.get(current) || [];
            } else if (direction === "reverse") {
                neighbors = graph.adjReverse.get(current) || [];
            } else {
                // Undirected: both forward citations and being cited
                const fwd = graph.adjForward.get(current) || [];
                const rev = graph.adjReverse.get(current) || [];
                neighbors = Array.from(new Set([...fwd, ...rev]));
            }

            for (const nxt of neighbors) {
                if (!visited.has(nxt)) {
                    visited.add(nxt);
                    parent.set(nxt, current);
                    queue.push(nxt);
                }
            }
        }

        return [];
    }

    /**
     * Gets all precursor works cited by workId up to maxDepth.
     * A cites B -> B is precursor of A.
     */
    function getPrecursors(graph, workId, maxDepth = 2) {
        const id = Number(workId);
        if (!graph.worksMap.has(id)) return [];

        const results = [];
        const visited = new Map(); // id -> depth
        visited.set(id, 0);

        const queue = [{ id, depth: 0 }];

        while (queue.length > 0) {
            const { id: currId, depth } = queue.shift();
            if (depth >= maxDepth) continue;

            const neighbors = graph.adjForward.get(currId) || [];
            for (const nxt of neighbors) {
                if (!visited.has(nxt)) {
                    const nextDepth = depth + 1;
                    visited.set(nxt, nextDepth);
                    const work = graph.worksMap.get(nxt);
                    const edgeKey = `${currId}->${nxt}`;
                    const meta = graph.edgeMetadata.get(edgeKey) || {};

                    results.push({
                        id: nxt,
                        title: work ? work.title : "Desconocido",
                        year: work ? work.year : null,
                        depth: nextDepth,
                        relationshipType: meta.type || RelationshipType.CITES,
                        confidence: meta.confidence || 1.0,
                        citedFromId: currId
                    });

                    queue.push({ id: nxt, depth: nextDepth });
                }
            }
        }

        return results;
    }

    /**
     * Gets all descendant works that cite workId up to maxDepth.
     * A cites B -> A is descendant of B.
     */
    function getDescendants(graph, workId, maxDepth = 2) {
        const id = Number(workId);
        if (!graph.worksMap.has(id)) return [];

        const results = [];
        const visited = new Map();
        visited.set(id, 0);

        const queue = [{ id, depth: 0 }];

        while (queue.length > 0) {
            const { id: currId, depth } = queue.shift();
            if (depth >= maxDepth) continue;

            const neighbors = graph.adjReverse.get(currId) || [];
            for (const nxt of neighbors) {
                if (!visited.has(nxt)) {
                    const nextDepth = depth + 1;
                    visited.set(nxt, nextDepth);
                    const work = graph.worksMap.get(nxt);
                    const edgeKey = `${nxt}->${currId}`;
                    const meta = graph.edgeMetadata.get(edgeKey) || {};

                    results.push({
                        id: nxt,
                        title: work ? work.title : "Desconocido",
                        year: work ? work.year : null,
                        depth: nextDepth,
                        relationshipType: meta.type || RelationshipType.CITES,
                        confidence: meta.confidence || 1.0,
                        citerId: nxt
                    });

                    queue.push({ id: nxt, depth: nextDepth });
                }
            }
        }

        return results;
    }

    /**
     * Computes network centrality and structural indicators across the corpus.
     */
    function computeNetworkMetrics(graph, works = []) {
        const metrics = {
            totalWorks: works.length,
            totalEdges: graph.edgesCount,
            inDegree: {},
            outDegree: {},
            rootWorks: [], // foundational works (outDegree == 0 in graph, no precursors listed)
            mostCitedWorks: [],
            isolatedWorks: []
        };

        works.forEach(w => {
            const id = Number(w.id);
            const inDeg = (graph.adjReverse.get(id) || []).length;
            const outDeg = (graph.adjForward.get(id) || []).length;

            metrics.inDegree[id] = inDeg;
            metrics.outDegree[id] = outDeg;

            if (inDeg === 0 && outDeg === 0) {
                metrics.isolatedWorks.push(id);
            } else if (outDeg === 0 && inDeg > 0) {
                metrics.rootWorks.push(id);
            }
        });

        // Most cited
        const sortedByCitations = [...works].sort((a, b) => {
            return (metrics.inDegree[b.id] || 0) - (metrics.inDegree[a.id] || 0);
        });

        metrics.mostCitedWorks = sortedByCitations.slice(0, 5).map(w => ({
            id: w.id,
            title: w.title,
            year: w.year,
            citations: metrics.inDegree[w.id] || 0
        }));

        return metrics;
    }

    /**
     * Calculates citation time latency and dormancy (e.g. Mendel latency).
     * 
     * @param {number} citerYear
     * @param {number} citedYear
     * @returns {Object} { lagYears, isRetrospective, label }
     */
    function calculateCitationLag(citerYear, citedYear) {
        if (!citerYear || !citedYear) {
            return { lagYears: null, isRetrospective: false, label: "Desconocido" };
        }
        const lag = Number(citerYear) - Number(citedYear);
        let label = "Contemporánea (0-5 años)";
        let isRetrospective = false;

        if (lag > 30) {
            label = "Redescubrimiento Histórico / Latencia Alta (> 30 años)";
            isRetrospective = true;
        } else if (lag > 15) {
            label = "Recepción Tardía (15-30 años)";
            isRetrospective = true;
        } else if (lag > 5) {
            label = "Recepción Diferida (5-15 años)";
        } else if (lag < 0) {
            label = "Anacronismo / Datación preliminar";
        }

        return {
            lagYears: lag,
            isRetrospective,
            label
        };
    }

    /**
     * Filters works array.
     */
    function filterCorpus(works = [], filters = {}) {
        if (!Array.isArray(works)) return [];

        return works.filter(w => {
            // Text search
            if (filters.search) {
                const q = filters.search.toLowerCase().trim();
                const title = (w.title || "").toLowerCase();
                const authors = (w.authors || []).map(a => (a.name || "").toLowerCase()).join(" ");
                const subject = (w.subject || "").toLowerCase();
                if (!title.includes(q) && !authors.includes(q) && !subject.includes(q)) return false;
            }

            // Year range
            if (filters.yearFrom && Number.isFinite(Number(filters.yearFrom))) {
                if (!w.year || Number(w.year) < Number(filters.yearFrom)) return false;
            }
            if (filters.yearTo && Number.isFinite(Number(filters.yearTo))) {
                if (!w.year || Number(w.year) > Number(filters.yearTo)) return false;
            }

            // Type
            if (filters.workType && filters.workType !== "ALL") {
                if (w.work_type !== filters.workType) return false;
            }

            // Translations check
            if (filters.hasTranslations !== undefined && filters.hasTranslations !== "ALL") {
                const hasTrans = (w.expressions || []).some(e => e.is_translation);
                if (filters.hasTranslations === true && !hasTrans) return false;
                if (filters.hasTranslations === false && hasTrans) return false;
            }

            return true;
        });
    }

    /**
     * Generates a comprehensive archaeological dossier in Markdown.
     */
    function generatePaperDossier(work, graph, worksMap) {
        if (!work) return "";

        const authorsStr = (work.authors || []).map(a => a.name).join(", ") || "Anónimo";
        const precursors = getPrecursors(graph, work.id, 2);
        const descendants = getDescendants(graph, work.id, 2);

        let expressionsRows = "";
        if (Array.isArray(work.expressions) && work.expressions.length > 0) {
            expressionsRows = work.expressions.map(ex => {
                const pubs = (ex.publications || []).map(p => `${p.venue || "Publicación"} (${p.year || "S/D"})${p.doi ? ` [DOI: ${p.doi}]` : ""}`).join("; ");
                return `| \`${ex.language}\` | *${ex.title}* | ${ex.is_translation ? "✓ Traducción" : "Original"} | ${pubs || "Sin registro"} |`;
            }).join("\n");
        } else {
            expressionsRows = "| (Sin expresiones registradas) | - | - | - |";
        }

        let precursorRows = "";
        if (precursors.length > 0) {
            precursorRows = precursors.map(p => {
                const lag = calculateCitationLag(work.year, p.year);
                return `| [ID ${p.id}] *${p.title}* | ${p.year || "S/D"} | Prof. ${p.depth} | \`${p.relationshipType}\` | ${lag.lagYears !== null ? `${lag.lagYears} años (${lag.label})` : "-"} |`;
            }).join("\n");
        } else {
            precursorRows = "| *(No registra precursores directos en este corpus)* | - | - | - | - |";
        }

        let descendantRows = "";
        if (descendants.length > 0) {
            descendantRows = descendants.map(d => {
                const lag = calculateCitationLag(d.year, work.year);
                return `| [ID ${d.id}] *${d.title}* | ${d.year || "S/D"} | Prof. ${d.depth} | \`${d.relationshipType}\` | ${lag.lagYears !== null ? `${lag.lagYears} años` : "-"} |`;
            }).join("\n");
        } else {
            descendantRows = "| *(No registra obras descendientes en este corpus)* | - | - | - | - |";
        }

        return `# DOSSIER ARQUEOLÓGICO: ${work.title}
**Instrumento:** PAPER ARCHAEOLOGY (v2.0.0)  
**ID de Obra (Work ID):** \`${work.id}\`  
**Fecha de Consulta:** ${new Date().toISOString().split('T')[0]}  

---

## 1. Identificación del Concepto Abstracto (FRBR Work)
- **Título Canónico:** *${work.title}*
- **Autores:** ${authorsStr}
- **Año de Formulación:** ${work.year || "Desconocido"}
- **Tipo de Obra:** \`${work.work_type || "paper"}\`
- **Disciplina / Asunto:** ${work.subject || "No especificado"}

## 2. Realizaciones Lingüísticas y Editoriales (FRBR Expressions & Publications)
| Idioma | Título de la Expresión | Condición | Publicaciones / Sedes |
| :--- | :--- | :--- | :--- |
${expressionsRows}

## 3. Genealogía Intelectual: Precursores e Influencias Anteriores
*Obras que este trabajo cita o sobre las que se fundamenta:*
| Obra Precursora | Año | Distancia | Vínculo | Salto Temporal (Latencia) |
| :--- | :--- | :--- | :--- | :--- |
${precursorRows}

## 4. Genealogía Intelectual: Obras Descendientes y Recepción
*Obras posteriores que citan, reformulan o extienden esta contribución:*
| Obra Descendiente | Año | Distancia | Vínculo | Retraso de Recepción |
| :--- | :--- | :--- | :--- | :--- |
${descendantRows}

## 5. Principio de Arqueología Bibliográfica
> *«Un artículo científico tiene una fecha de publicación. Su historia, generalmente, no.»*  
> Las ideas científicas viajan por caminos sinuosos: traducciones no autorizadas, olvido prolongado y redescubrimientos. Este registro preserva la trayectoria viva de la obra más allá del mero conteo plano de citas.

---
*Generado automáticamente por el motor de Paper Archaeology.*
`;
    }

    return {
        RelationshipType,
        WorkType,
        buildGraph,
        findShortestPath,
        getPrecursors,
        getDescendants,
        computeNetworkMetrics,
        calculateCitationLag,
        filterCorpus,
        generatePaperDossier
    };
}));
