/**
 * Node.js Test Suite for Paper Archaeology Engine (js/archaeology-engine.js)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ArchaeologyEngine = require('../js/archaeology-engine.js');

let passedTests = 0;
let totalTests = 0;

function test(description, fn) {
    totalTests++;
    try {
        fn();
        console.log(`  ✓ ${description}`);
        passedTests++;
    } catch (err) {
        console.error(`  ✗ ${description}`);
        console.error(`    ${err.message}`);
        throw err;
    }
}

console.log('=== Running Paper Archaeology Engine Tests ===\n');

// Load corpus bundle
const corpusPath = path.join(__dirname, '..', 'data', 'corpus_bundle.json');
const bundle = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));
const works = bundle.works;
const relationships = bundle.relationships;

// 1. Graph Construction
test('buildGraph: constructs directed citation graph with correct node and edge counts', () => {
    const graph = ArchaeologyEngine.buildGraph(works, relationships);
    assert.strictEqual(graph.nodesCount, 34, `Expected 34 nodes, got ${graph.nodesCount}`);
    assert.strictEqual(graph.edgesCount, 25, `Expected 25 edges, got ${graph.edgesCount}`);
    assert(graph.worksMap.has(1), 'Should contain Work ID 1 (Shannon 1948)');
    assert(graph.worksMap.has(2), 'Should contain Work ID 2 (Turing 1937)');
});

// 2. Precursors & Descendants
test('getPrecursors: finds precursor works cited by Turing (Work 2) and Watson & Crick (Work 4)', () => {
    const graph = ArchaeologyEngine.buildGraph(works, relationships);
    
    // Work 2 cites Work 11
    const turingPrecursors = ArchaeologyEngine.getPrecursors(graph, 2, 2);
    assert(turingPrecursors.length >= 1, 'Turing should have at least 1 precursor');
    assert(turingPrecursors.some(p => p.id === 11), 'Turing should cite Work 11');

    // Work 4 cites Work 12, 13, 14, 15, 16
    const watsonPrecursors = ArchaeologyEngine.getPrecursors(graph, 4, 2);
    assert.strictEqual(watsonPrecursors.length, 5, `Expected Watson & Crick to cite 5 works, got ${watsonPrecursors.length}`);
    const citedIds = watsonPrecursors.map(p => p.id);
    assert(citedIds.includes(12) && citedIds.includes(13) && citedIds.includes(14) && citedIds.includes(15) && citedIds.includes(16));
});

test('getDescendants: finds descendant works that cite foundational papers', () => {
    const graph = ArchaeologyEngine.buildGraph(works, relationships);
    
    // Work 11 is cited by Work 2
    const descendants11 = ArchaeologyEngine.getDescendants(graph, 11, 2);
    assert(descendants11.length >= 1, 'Work 11 should have at least 1 descendant');
    assert(descendants11.some(d => d.id === 2), 'Work 11 should be cited by Turing (Work 2)');

    // Work 12 is cited by Work 4
    const descendants12 = ArchaeologyEngine.getDescendants(graph, 12, 2);
    assert(descendants12.some(d => d.id === 4), 'Work 12 should be cited by Watson & Crick (Work 4)');
});

// 3. Shortest Citation Path
test('findShortestPath: discovers shortest path between connected works', () => {
    const graph = ArchaeologyEngine.buildGraph(works, relationships);
    
    // Direct link between 4 and 12
    const directPath = ArchaeologyEngine.findShortestPath(graph, 4, 12, 'forward');
    assert.deepStrictEqual(directPath, [4, 12], `Expected [4, 12], got ${JSON.stringify(directPath)}`);

    // Undirected path from 12 back to 4
    const undirectedPath = ArchaeologyEngine.findShortestPath(graph, 12, 4, 'undirected');
    assert.deepStrictEqual(undirectedPath, [12, 4]);

    // Unconnected path in forward direction
    const noPath = ArchaeologyEngine.findShortestPath(graph, 1, 999, 'forward');
    assert.deepStrictEqual(noPath, []);
});

// 4. Citation Time Lag & Dormancy
test('calculateCitationLag: correctly characterizes contemporaneity vs historical dormancy', () => {
    // Contemporary (e.g. 1953 cites 1952 -> 1 year)
    const contemporary = ArchaeologyEngine.calculateCitationLag(1953, 1952);
    assert.strictEqual(contemporary.lagYears, 1);
    assert.strictEqual(contemporary.isRetrospective, false);
    assert(contemporary.label.includes('Contemporánea'));

    // High latency / Historical rediscovery (e.g. 1900 cites Mendel 1866 -> 34 years)
    const rediscovery = ArchaeologyEngine.calculateCitationLag(1900, 1866);
    assert.strictEqual(rediscovery.lagYears, 34);
    assert.strictEqual(rediscovery.isRetrospective, true);
    assert(rediscovery.label.includes('Redescubrimiento Histórico'));
});

// 5. Network Metrics
test('computeNetworkMetrics: calculates degree distribution and identifies root papers', () => {
    const graph = ArchaeologyEngine.buildGraph(works, relationships);
    const metrics = ArchaeologyEngine.computeNetworkMetrics(graph, works);

    assert.strictEqual(metrics.totalWorks, 34);
    assert.strictEqual(metrics.totalEdges, 25);
    assert(metrics.mostCitedWorks.length > 0);
    assert(Array.isArray(metrics.rootWorks));
});

// 6. Corpus Filtering
test('filterCorpus: filters by title, author and year range', () => {
    // Search Einstein
    const einsteinWorks = ArchaeologyEngine.filterCorpus(works, { search: 'Einstein' });
    assert(einsteinWorks.length >= 3, `Expected >= 3 Einstein works, got ${einsteinWorks.length}`);
    einsteinWorks.forEach(w => {
        const hasEinstein = w.title.toLowerCase().includes('einstein') || 
            (w.authors || []).some(a => a.name.toLowerCase().includes('einstein'));
        assert(hasEinstein);
    });

    // Year range filter 1900 to 1910
    const decade1900 = ArchaeologyEngine.filterCorpus(works, { yearFrom: 1900, yearTo: 1910 });
    assert(decade1900.length >= 4, 'Should find works in 1900-1910 decade');
    decade1900.forEach(w => {
        assert(w.year >= 1900 && w.year <= 1910);
    });
});

// 7. Markdown Dossier Generation
test('generatePaperDossier: generates complete Markdown document with FRBR and genealogy', () => {
    const graph = ArchaeologyEngine.buildGraph(works, relationships);
    const watsonWork = works.find(w => w.id === 4);
    assert(watsonWork, 'Watson & Crick work should exist');

    const dossier = ArchaeologyEngine.generatePaperDossier(watsonWork, graph, graph.worksMap);
    assert(dossier.includes('DOSSIER ARQUEOLÓGICO: Molecular Structure of Nucleic Acids'));
    assert(dossier.includes('Watson') || dossier.includes('Crick'));
    assert(dossier.includes('FRBR Work'));
    assert(dossier.includes('Genealogía Intelectual: Precursores'));
    assert(dossier.includes('Un artículo científico tiene una fecha de publicación. Su historia, generalmente, no.'));
});

console.log(`\nAll ${passedTests}/${totalTests} engine tests passed successfully!`);
