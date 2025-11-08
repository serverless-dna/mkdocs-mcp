# mkdocs-mcp Search Alignment TODO

## Goal
Align mkdocs-mcp search experience with mkdocs-material's backend search behavior.

## ✅ Completed Tasks

### ✅ Logger Refactoring (Bonus)
**Completed:** Replaced Powertools logger with simple stderr logger
- Removed @aws-lambda-powertools/logger dependency
- Implemented lightweight custom logger with stderr output
- Added comprehensive tests (94.11% coverage)
- Support log levels: DEBUG, INFO, WARN, ERROR
- Include timestamps, service name, and JSON metadata
- Environment configurable via LOG_LEVEL
- MCP-friendly (keeps stdout clean for protocol)

### ✅ 1. Fix Boost Values ⭐
**Completed:** Updated boost values to match mkdocs-material
- Title boost: 10x → **1000x** ✅
- Tags boost: none → **1000000x** ✅  
- Text boost: 1x → **1x** (unchanged) ✅

**File:** `src/shared/searchIndex.ts` - `mkDocsToLunrIndex()` function

### ✅ 2. Add Parent/Child Document Relationships ⭐
**Completed:** Detect and link sections to parent articles
- Articles: `"page.html"` ✅
- Sections: `"page.html#section"` ✅
- Link sections to their parent articles ✅
- Added metadata: `isSection`, `articlePath`, `parent` fields ✅

**File:** `src/shared/searchIndex.ts` - `mkDocsToLunrIndex()` function

### ✅ 3. Implement Result Grouping ⭐
**Completed:** Group search results by parent article (like mkdocs-material)
- Group results: `[article, ...sections]` per group ✅
- Sort groups by best match within group ✅
- Ensure each group has the main article ✅
- Maintain backward compatibility ✅

**Files:** 
- `src/shared/searchIndex.ts` - `searchDocuments()` function

### ✅ 4. Enhanced Search Output (Bonus)
**Completed:** Optimized search results for AI assistants
- Flat structure for easy processing ✅
- Parent article context for sections ✅
- Single parent relationship (matches MkDocs structure) ✅
- Rich metadata while maintaining simplicity ✅

**Example Output:**
```json
{
  "title": "Configuration",
  "url": "https://docs.example.com/latest/core/logger/#configuration", 
  "score": 8.7,
  "preview": "Configure the logger...",
  "location": "core/logger/#configuration",
  "parentArticle": {
    "title": "Logger",
    "location": "core/logger/",
    "url": "https://docs.example.com/latest/core/logger/"
  }
}
```

**File:** `src/tools/searchMkDoc/tool.ts` - result formatting

### ✅ 6. Add Search Suggestions ⭐
**Completed:** Return suggested terms for partial matches
- Wildcard search on titles with trailing wildcard ✅
- Extract matching terms from best results ✅
- Return unique suggestions (max 5) ✅
- Only suggest when few results found (< 3) ✅
- Graceful error handling ✅

**Example Output:**
```json
{
  "query": "loger",
  "results": [],
  "total": 0,
  "suggestions": ["logger", "logging", "log"]
}
```

**File:** `src/shared/searchIndex.ts` - `searchDocuments()` function

## Medium Priority Tasks

### 5. Improve Result Scoring
**Goal:** Add post-query boosts based on:
- Title matches
- Number of matching terms  
- Document type (article vs section)

**File:** `src/shared/searchIndex.ts` - `searchDocuments()` function

### 6. Add Search Suggestions
**Goal:** Return suggested terms for partial matches
- Implement "did you mean..." functionality
- Return alternative search terms

**File:** `src/shared/searchIndex.ts` - `searchDocuments()` function

## Implementation Notes

- ✅ Focus on backend search logic, not frontend highlighting
- ✅ Maintain backward compatibility with existing API
- ✅ Optimized for AI assistant consumption
- ✅ Single parent relationships (matches MkDocs structure)
- Consider performance impact of grouping on large result sets

## Testing

- [x] Test with mkdocs-material documentation site
- [x] Compare results with actual mkdocs-material search
- [x] Verify parent/child relationships work correctly
- [x] Test boost values produce expected ranking
- [x] Verify AI-friendly output structure

## 🎉 Status Summary
**High Priority Tasks: 3/3 COMPLETED ✅**
**Bonus Enhancements: 3/3 COMPLETED ✅**
**Medium Priority Tasks: 1/2 remaining**

**Overall Progress: 6/7 tasks completed (86%)**

## 🚀 Impact
- **Significantly improved search relevance** (1000x title, 1000000x tag boosts)
- **Proper result grouping** by parent articles
- **AI-optimized output** with parent context
- **Matches mkdocs-material core behavior**
- **Maintains backward compatibility**
