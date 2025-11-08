# mkdocs-mcp Search Alignment TODO

## Goal
Align mkdocs-mcp search experience with mkdocs-material's backend search behavior.

## High Priority Tasks

### 1. Fix Boost Values ⭐
**Current:**
```typescript
this.field('title', { boost: 10 });
this.field('text'); // no boost = 1
```

**Should be:**
```typescript
this.field('title', { boost: 1000 });
this.field('tags', { boost: 1000000 });
this.field('text', { boost: 1 });
```

**File:** `src/shared/searchIndex.ts` - `mkDocsToLunrIndex()` function

### 2. Add Parent/Child Document Relationships ⭐
**Goal:** Detect and link sections to parent articles
- Articles: `"page.html"` 
- Sections: `"page.html#section"`
- Link sections to their parent articles

**Implementation:**
- Parse `location` field to detect articles vs sections
- Create parent-child relationships in document map
- Store parent reference in section documents

**File:** `src/shared/searchIndex.ts` - `mkDocsToLunrIndex()` function

### 3. Implement Result Grouping ⭐
**Goal:** Group search results by parent article (like mkdocs-material)
- Group results: `[article, ...sections]` per group
- Sort groups by best match within group
- Ensure each group has the main article

**Files:** 
- `src/shared/searchIndex.ts` - `searchDocuments()` function
- `src/tools/searchMkDoc/tool.ts` - result processing

## Medium Priority Tasks

### 4. Improve Result Scoring
**Goal:** Add post-query boosts based on:
- Title matches
- Number of matching terms  
- Document type (article vs section)

**File:** `src/shared/searchIndex.ts` - `searchDocuments()` function

### 5. Add Search Suggestions
**Goal:** Return suggested terms for partial matches
- Implement "did you mean..." functionality
- Return alternative search terms

**File:** `src/shared/searchIndex.ts` - `searchDocuments()` function

## Low Priority Tasks

### 6. Add Tags Field Support
**Current:** Tags not indexed in Lunr
**Should:** Add tags field with high boost

```typescript
this.field('tags', { boost: 1000000 });
```

**File:** `src/shared/searchIndex.ts` - `mkDocsToLunrIndex()` function

## Implementation Notes

- Focus on backend search logic, not frontend highlighting
- Maintain backward compatibility with existing API
- Test with real mkdocs-material sites for comparison
- Consider performance impact of grouping on large result sets

## Testing

- [ ] Test with mkdocs-material documentation site
- [ ] Compare results with actual mkdocs-material search
- [ ] Verify parent/child relationships work correctly
- [ ] Test boost values produce expected ranking
