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
    
    // Add only essential document data to the map
    for (const doc of mkDocsIndex.docs) {
        documents.set(doc.location, {
            title: doc.title,
            location: doc.location,
            // Store a truncated preview of text instead of the full content
            preview: doc.text ? doc.text.substring(0, 200) + (doc.text.length > 200 ? '...' : '') : '',
            // Optionally store tags if needed
            tags: doc.tags || []
        });
    }
    
    // Create a new lunr index
    const index = lunr(function() {
        // Configure the index based on mkdocs config
        this.ref('location');
        this.field('title', { boost: 10 });
        this.field('text');
        
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
    
    // Map results to include document data
    const mappedResults = results.map(result => {
        const doc = searchIndex.documents!.get(result.ref);
        return {
            ...result,
            document: doc
        };
    });

    return {
        query,
        version,
        results: mappedResults,
        total: mappedResults.length
    };
}


