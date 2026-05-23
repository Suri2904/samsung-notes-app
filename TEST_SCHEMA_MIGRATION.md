# Schema Migration Test Plan

## ✅ Phase 1 Complete: V2 JSON Schema Migration

### What Changed

The app now uses **V2 JSON Schema** as specified:

```json
{
  "schemaVersion": 2,
  "id": "uuid",
  "title": "Drawing Title",
  "createdAt": "2026-05-23T...",
  "updatedAt": "2026-05-23T...",
  "zoom": 1.5,
  "pan": { "x": -100, "y": -50 },
  "currentPageIndex": 0,
  "pages": [
    {
      "id": "page-uuid",
      "size": "A4",
      "orientation": "landscape",
      "backgroundPattern": "grid",
      "strokes": [
        {
          "id": "stroke-uuid",
          "tool": "pen",
          "color": "#000000",
          "size": "M",
          "points": [
            { "x": 100, "y": 200, "pressure": 0.8 }
          ]
        }
      ]
    }
  ]
}
```

### Backward Compatibility

✅ **Old V1 files automatically upgrade on:**
- Load from localStorage (storage.getAllDrawings())
- Import via button
- Import via drag-and-drop

### Testing Instructions

#### Test 1: Verify New Documents Use V2

1. Open app: http://localhost:5177/samsung-notes-app/
2. Create new drawing
3. Draw some strokes
4. Change page size to A3
5. Zoom to 150% and pan around
6. Export as JSON
7. Open the .json file in text editor
8. Verify:
   - ✅ `schemaVersion: 2` exists
   - ✅ `zoom` and `pan` fields present
   - ✅ `currentPageIndex` exists
   - ✅ `updatedAt` (not `lastModified`)
   - ✅ `pages[0].id` exists
   - ✅ `pages[0].size` is "A4" or "A3" (uppercase)
   - ✅ `pages[0].backgroundPattern` (not `background`)
   - ✅ Each stroke has `id` field
   - ✅ No `imageData` field (removed redundancy)

#### Test 2: Verify Old V1 Files Auto-Migrate

1. Create a V1 format file (old_drawing.samsungnote.json):
```json
{
  "version": 1,
  "id": "test-123",
  "title": "Old Drawing",
  "pageSize": "a4",
  "orientation": "landscape",
  "pages": [
    {
      "background": "ruled",
      "strokes": [
        {
          "tool": "pen",
          "color": "#FF0000",
          "size": "M",
          "points": [{"x": 100, "y": 100, "pressure": 0.5}]
        }
      ],
      "imageData": "data:image/png;base64,..."
    }
  ],
  "createdAt": "2025-01-01T00:00:00.000Z",
  "lastModified": "2025-01-01T00:00:00.000Z"
}
```

2. Import this file via File Hub
3. Verify toast shows: "Imported: Old Drawing (migrated from V1)"
4. Open the drawing
5. Verify:
   - ✅ Drawing renders correctly
   - ✅ Background pattern is "ruled"
   - ✅ Red stroke appears
6. Export as JSON again
7. Verify exported file is now V2 format:
   - ✅ `schemaVersion: 2`
   - ✅ `updatedAt` instead of `lastModified`
   - ✅ `pages[0].backgroundPattern: "ruled"`
   - ✅ Stroke has `id` field
   - ✅ Page has `id` field

#### Test 3: Verify Zoom/Pan State Persistence

1. Create new drawing
2. Zoom to 200%
3. Pan to top-right corner
4. Draw some strokes
5. Export JSON
6. Check exported JSON:
   - ✅ `zoom: 2`
   - ✅ `pan: {x: ..., y: ...}` (non-zero values)
7. Import the same JSON
8. Open the drawing
9. Verify:
   - ✅ Canvas loads at 200% zoom
   - ✅ Canvas is panned to same position
   - ✅ Strokes visible in correct location

#### Test 4: Verify Per-Page Configuration

1. Create drawing with 3 pages
2. Page 1: A4 landscape
3. Page 2: A3 portrait
4. Page 3: A4 portrait
5. Export JSON
6. Verify exported JSON:
   ```json
   "pages": [
     {"size": "A4", "orientation": "landscape", ...},
     {"size": "A3", "orientation": "portrait", ...},
     {"size": "A4", "orientation": "portrait", ...}
   ]
   ```
7. Import the JSON
8. Navigate through pages
9. Verify:
   - ✅ Page 1 shows "A4 ↔" in toolbar
   - ✅ Page 2 shows "A3 ↕" in toolbar
   - ✅ Page 3 shows "A4 ↕" in toolbar
   - ✅ Canvas dimensions change per page

#### Test 5: Verify localStorage Auto-Migration

1. Manually inject V1 document into localStorage:
```js
// Run in browser console
const v1Doc = {
  version: 1,
  id: "manual-test",
  title: "LocalStorage Test",
  pageSize: "a3",
  orientation: "portrait",
  pages: [{ background: "dots", strokes: [] }],
  createdAt: new Date().toISOString(),
  lastModified: new Date().toISOString()
};

const drawings = JSON.parse(localStorage.getItem('samsung_notes_drawings') || '[]');
drawings.push(v1Doc);
localStorage.setItem('samsung_notes_drawings', JSON.stringify(drawings));
```

2. Refresh the page
3. Check browser console for:
   - ✅ Log: "Migrating document 'LocalStorage Test' from V1 to V2"
4. Verify File Hub shows the drawing
5. Open the drawing
6. Verify it works correctly
7. Export JSON and verify V2 format

#### Test 6: Verify Stroke IDs

1. Create new drawing
2. Draw 5 different strokes (different tools/colors)
3. Export JSON
4. Verify each stroke has unique `id` field:
```json
"strokes": [
  {"id": "uuid-1", "tool": "pen", ...},
  {"id": "uuid-2", "tool": "highlighter", ...},
  {"id": "uuid-3", "tool": "pen", ...}
]
```
5. All IDs should be different UUIDs

### Expected Results

✅ All tests pass
✅ No console errors
✅ Old V1 files work seamlessly
✅ New files use V2 schema
✅ Zoom/pan persists across sessions
✅ Per-page configuration works
✅ All UUIDs are unique and valid

### Rollback Plan (If Needed)

If issues arise, the migration is non-destructive:
1. V1 files remain readable (migration happens on load, not on save)
2. To rollback: `git revert b98726c`
3. Users can export their drawings before rollback
4. Re-import will work after rollback (V2 → V1 converter not needed)

### Performance Impact

✅ Negligible - Migration happens:
- Once on app load (getAllDrawings)
- Once per import
- Results cached in localStorage

### Documentation Updated

- [x] AUDIT_AND_IMPLEMENTATION_PLAN.md
- [x] TEST_SCHEMA_MIGRATION.md
- [ ] COMPLETE_FEATURE_LIST.md (update after verification)

---

**Status:** Phase 1 Complete - Ready for Testing
**Next:** Phase 2 (Touch Event Hardening) after verification
