import { fetchService } from '../services/fetch';
import { ContentType } from '../services/fetch/types';
import { logger } from '../services/logger';

import lunr from 'lunr';

// Define the structure of MkDocs search index
interface MkDocsSearchIndex {
    config: {
        lang: string[];
        separator: string;
        pipeline: string[];
    };
    docs: Array<{
        location: string;
        title: string;
        text: string;
        tags?: string[];
    }>;
}

// Function to fetch available versions for a site
async function fetchAvailableVersions(baseUrl: string): Promise<Array<{title: string, version: string, aliases: string[]}> | undefined> {
    try {
        const url = `${baseUrl}/versions.json`;
        const response = await fetchService.fetch(url, {
            contentType: ContentType.WEB_PAGE,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            return undefined;
        }
        
        return await response.json();
    } catch (error) {
        logger.info(`Error fetching versions: ${error}`);
        return undefined;
    }
}

// Function to get the search index URL for a version
function getSearchIndexUrl(baseUrl: string, version = 'latest'): string {
    return `${baseUrl}/${version}/search/search_index.json`;
}

// Function to fetch the search index for a version
async function fetchSearchIndex(baseUrl: string, version = 'latest'): Promise<MkDocsSearchIndex | undefined> {
    try {
        const url = getSearchIndexUrl(baseUrl, version);
        const response = await fetchService.fetch(url, {
            contentType: ContentType.WEB_PAGE,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch search index: ${response.status} ${response.statusText}`);
        }
        
        const indexData = await response.json();
        return indexData as MkDocsSearchIndex;
    } catch (error) {
        logger.info(`Error fetching search index for ${version}: ${error}`);
        return undefined;
    }
}

// Define our search index structure
export interface SearchIndex {
    version: string;
    url: string;
    index: lunr.Index | undefined;
    documents: Map<string, any> | undefined;
}

/**
 * Convert MkDocs search index to Lunr index
 * Based on the mkdocs-material implementation
 * Optimized to store only essential fields in the document map to reduce memory usage
 */
function mkDocsToLunrIndex(mkDocsIndex: MkDocsSearchIndex): { index: lunr.Index, documents: Map<string, any> } {
    // Create a document map for quick lookups - with minimal data
    const documents = new Map<string, any>();
    
    // First pass: identify articles and create parent-child relationships
    const articleMap = new Map<string, any>(); // Maps article path to article document
    
    // Add document data to the map with parent/child relationships
    for (const doc of mkDocsIndex.docs) {
        const [articlePath] = doc.location.split('#');
        const isSection = doc.location.includes('#');
        
        const docData = {
            title: doc.title,
            location: doc.location,
            // Store a truncated preview of text instead of the full content
            preview: doc.text ? doc.text.substring(0, 200) + (doc.text.length > 200 ? '...' : '') : '',
            // Optionally store tags if needed
            tags: doc.tags || [],
            // Add parent/child relationship info
            isSection,
            articlePath,
            parent: undefined as any // Will be set for sections
        };
        
        if (isSection) {
            // This is a section - link it to its parent article
            const parentArticle = articleMap.get(articlePath);
            if (parentArticle) {
                docData.parent = parentArticle;
            }
        } else {
            // This is an article - store it for sections to reference
            articleMap.set(articlePath, docData);
        }
        
        documents.set(doc.location, docData);
    }
    
    // Create a new lunr index
    const index = lunr(function() {
        // Configure the index based on mkdocs config
        this.ref('location');
        this.field('title', { boost: 1000 });
        this.field('text', { boost: 1 });
        this.field('tags', { boost: 1000000 });
        
        // Add documents to the index
        for (const doc of mkDocsIndex.docs) {
            // Skip empty documents
            if (!doc.location && !doc.title && !doc.text) continue;
            
            this.add({
                location: doc.location,
                title: doc.title,
                text: doc.text,
                tags: doc.tags || []
            });
        }
    });
    
    return { index, documents };
}

export class SearchIndexFactory {
    readonly indices: Map<string, SearchIndex>;
    readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.indices = new Map<string, SearchIndex>();
        this.baseUrl = baseUrl;
    }

    // Backward compatibility alias for tests
    async getIndex(version = 'latest'): Promise<SearchIndex | undefined> {
        return this.getSearchIndex(version);
    }

    // Version resolution method for tests
    async resolveVersion(version: string): Promise<{ valid: boolean; resolved: string; available?: Array<{title: string, version: string, aliases: string[]}> }> {
        const availableVersions = await this.getAvailableVersions();
        
        if (!availableVersions) {
            return { valid: false, resolved: version };
        }

        // Check if version exists directly
        const directMatch = availableVersions.find(v => v.version === version);
        if (directMatch) {
            return { valid: true, resolved: version, available: availableVersions };
        }

        // Check if version is an alias
        const aliasMatch = availableVersions.find(v => v.aliases.includes(version));
        if (aliasMatch) {
            return { valid: true, resolved: aliasMatch.version, available: availableVersions };
        }

        return { valid: false, resolved: version, available: availableVersions };
    }

    async getSearchIndex(version = 'latest'): Promise<SearchIndex | undefined> {
        // Check if we already have this index
        if (this.indices.has(version)) {
            return this.indices.get(version);
        }

        // Fetch the search index
        const mkDocsIndex = await fetchSearchIndex(this.baseUrl, version);
        if (!mkDocsIndex) {
            return undefined;
        }

        // Convert to Lunr index
        const { index, documents } = mkDocsToLunrIndex(mkDocsIndex);

        // Create our search index
        const searchIndex: SearchIndex = {
            version,
            url: getSearchIndexUrl(this.baseUrl, version),
            index,
            documents
        };

        // Cache it
        this.indices.set(version, searchIndex);

        return searchIndex;
    }

    async getAvailableVersions(): Promise<Array<{title: string, version: string, aliases: string[]}> | undefined> {
        return await fetchAvailableVersions(this.baseUrl);
    }
}

// Function to search documents
export async function searchDocuments(baseUrl: string, query: string, version = 'latest'): Promise<any> {
    const factory = new SearchIndexFactory(baseUrl);
    const searchIndex = await factory.getSearchIndex(version);
    
    if (!searchIndex || !searchIndex.index || !searchIndex.documents) {
        throw new Error(`No search index available for version: ${version}`);
    }

    // Perform the search
    const results = searchIndex.index.search(query);
    
    // Map results to include document data and apply advanced scoring
    const queryStr = String(query); // Ensure query is a string
    const queryTerms = queryStr.toLowerCase().split(/\s+/).filter(term => term.length > 1);
    
    const mappedResults = results.map(result => {
        const doc = searchIndex.documents!.get(result.ref);
        let enhancedScore = result.score;
        
        if (doc) {
            // Post-query boosts (like mkdocs-material)
            let boost = 1;
            
            // 1. Title match boost - if query terms appear in title
            const titleLower = doc.title.toLowerCase();
            const titleMatches = queryTerms.filter(term => titleLower.includes(term)).length;
            if (titleMatches > 0) {
                boost += titleMatches * 0.5; // 50% boost per matching term in title
            }
            
            // 2. Exact title match gets major boost
            if (titleLower === queryStr.toLowerCase()) {
                boost += 2.0; // 200% boost for exact title match
            }
            
            // 3. Article vs section boost - articles are slightly preferred
            if (!doc.isSection) {
                boost += 0.2; // 20% boost for articles over sections
            }
            
            // 4. Tag match boost - if query appears in tags
            if (doc.tags && doc.tags.length > 0) {
                const tagMatches = queryTerms.filter(term => 
                    doc.tags.some((tag: string) => tag.toLowerCase().includes(term))
                ).length;
                if (tagMatches > 0) {
                    boost += tagMatches * 0.3; // 30% boost per matching tag
                }
            }
            
            // Apply the boost
            enhancedScore = result.score * boost;
        }
        
        return {
            ...result,
            score: enhancedScore, // Use enhanced score
            originalScore: result.score, // Keep original for debugging
            document: doc
        };
    });

    // Group results by parent article (like mkdocs-material)
    const groups = new Map<string, any[]>();
    
    for (const result of mappedResults) {
        const doc = result.document;
        if (!doc) continue;
        
        // Determine the group key (article path)
        const groupKey = doc.isSection ? doc.articlePath : doc.location;
        
        // Get or create the group
        if (!groups.has(groupKey)) {
            groups.set(groupKey, []);
        }
        
        groups.get(groupKey)!.push(result);
    }
    
    // Ensure each group has its main article (like mkdocs-material does)
    for (const [articlePath, groupResults] of groups) {
        const hasArticle = groupResults.some(result => result.document.location === articlePath);
        
        if (!hasArticle) {
            // Find the article document and add it with score 0
            const articleDoc = searchIndex.documents!.get(articlePath);
            if (articleDoc) {
                groupResults.push({
                    ref: articlePath,
                    score: 0,
                    matchData: { metadata: {} },
                    document: articleDoc
                });
            }
        }
        
        // Sort results within each group by score (highest first)
        groupResults.sort((a, b) => b.score - a.score);
    }
    
    // Convert groups back to flat array, sorted by best score in each group
    const groupedResults = Array.from(groups.values())
        .sort((a, b) => b[0].score - a[0].score) // Sort groups by best result in group
        .flat(); // Flatten back to single array

    // Generate search suggestions (like mkdocs-material)
    let suggestions: string[] = [];
    
    // Only generate suggestions if we have few or no results
    if (groupedResults.length < 3) {
        try {
            // Use wildcard search on titles to find similar terms
            const suggestionResults = searchIndex.index.query(builder => {
                // Split query into terms and add wildcard to each
                const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1);
                
                for (const term of terms) {
                    builder.term(term, {
                        fields: ['title'],
                        wildcard: lunr.Query.wildcard.TRAILING,
                        boost: 10
                    });
                    
                    // Also try without wildcard for exact matches
                    builder.term(term, {
                        fields: ['title', 'text'],
                        boost: 1
                    });
                }
            });

            // Extract unique terms from the metadata of top results
            const suggestionTerms = new Set<string>();
            
            for (const result of suggestionResults.slice(0, 5)) {
                const metadata = result.matchData.metadata;
                for (const term of Object.keys(metadata)) {
                    // Only suggest terms that are different from the original query
                    const cleanTerm = term.toLowerCase();
                    if (cleanTerm.length > 2 && !query.toLowerCase().includes(cleanTerm)) {
                        suggestionTerms.add(term);
                    }
                }
            }
            
            suggestions = Array.from(suggestionTerms).slice(0, 5); // Limit to 5 suggestions
        } catch (error) {
            // If suggestion generation fails, continue without suggestions
            logger.debug('Failed to generate search suggestions', { error: error instanceof Error ? error.message : String(error) });
        }
    }

    return {
        query,
        version,
        results: groupedResults,
        total: groupedResults.length,
        groups: groups.size, // Add group count for debugging
        ...(suggestions.length > 0 && { suggestions }) // Only include if we have suggestions
    };
}


