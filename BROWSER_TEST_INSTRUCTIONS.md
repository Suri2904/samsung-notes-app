# Browser Testing Instructions - Phase 1

## 🎯 Quick Start

**App URL:** http://localhost:5177/samsung-notes-app/

Open the app in your browser and perform these tests:

---

## Test 1: New Drawing Uses V2 Schema ✅

1. Open the app
2. Click **"+ Create Drawing"**
3. Draw some strokes (any tool/color)
4. Click **"💾 Export"** button
5. Open the downloaded `.samsungnote.json` file in a text editor

**Expected Result:**
```json
{
  "schemaVersion": 2,
  "zoom": 1,
  "pan": {"x": 0, "y": 0},
  "currentPageIndex": 0,
  "updatedAt": "2026-05-23T...",
  "pages": [
    {
      "id": "...",
      "size": "A4",
      "orientation": "landscape",
      "backgroundPattern": "plain",
      "strokes": [
        {"id": "...", "tool": "pen", "points": [...]}
      ]
    }
  ]
}
```

**✅ Pass if:** All V2 fields present, no `lastModified`, no `imageData`

---

## Test 2: Import V1 File & Auto-Migration ✅

1. Download test file: `/Users/suryanshs/Downloads/samsung-notes-app/test_v1_drawing.samsungnote.json`
2. In File Hub, click **"📥 Import"** button
3. Select `test_v1_drawing.samsungnote.json`

**Expected Result:**
- ✅ Toast notification: **"Imported: V1 Test Drawing (migrated from V1)"**
- ✅ File appears in grid with title "V1 Test Drawing"

4. Click to open the drawing
5. Verify:
   - ✅ Page 1: Ruled background with red pen stroke and yellow highlight
   - ✅ Page 2: Grid background with blue fountain pen stroke
   - ✅ Page counter shows "Page 1 of 2"

6. Export the drawing again
7. Open exported file
8. Verify it's now V2 format (has `schemaVersion: 2`)

**✅ Pass if:** V1 file imported, rendered correctly, and re-exported as V2

---

## Test 3: Zoom/Pan State Persistence ✅

1. Create new drawing
2. Draw a stroke in the center
3. Click **"+"** zoom button 3 times (zoom to 175%)
4. Pan the canvas to bottom-left corner (drag with two fingers or mouse)
5. Click **"💾 Export"**
6. Open exported JSON

**Expected Result:**
```json
{
  "zoom": 1.75,
  "pan": {"x": -150, "y": -100},  // Non-zero values
  ...
}
```

7. Close the drawing (← Back)
8. Click **"📥 Import"** and import the same file
9. Open the imported drawing

**✅ Pass if:** Canvas opens at 175% zoom in bottom-left position (same state)

---

## Test 4: Per-Page Configuration ✅

1. Create new drawing
2. Keep Page 1 as: **A4 Landscape** (default)
3. Click **"+ Page"** to add Page 2
4. Click **"📄 A4 ↔"** button in top toolbar
5. Select **"A3"** → **"Portrait"**
6. Click **"+ Page"** to add Page 3
7. Keep Page 3 as **A4 Landscape**

8. Navigate between pages and verify toolbar shows:
   - Page 1: "A4 ↔"
   - Page 2: "A3 ↕"
   - Page 3: "A4 ↔"

9. Export the drawing
10. Open exported JSON

**Expected Result:**
```json
{
  "pages": [
    {"size": "A4", "orientation": "landscape", ...},
    {"size": "A3", "orientation": "portrait", ...},
    {"size": "A4", "orientation": "landscape", ...}
  ]
}
```

11. Import the file and verify page sizes match

**✅ Pass if:** Each page maintains its own size/orientation

---

## Test 5: Stroke & Page IDs ✅

1. Create drawing with 2 pages
2. Draw 3 strokes on each page (different tools)
3. Export JSON
4. Open in text editor
5. Copy all `"id"` values from pages and strokes

**Expected Result:**
- ✅ 2 page IDs (36-character UUIDs)
- ✅ 6 stroke IDs (36-character UUIDs)
- ✅ All IDs are unique (no duplicates)

Example:
```json
{
  "pages": [
    {
      "id": "798e9732-7f28-4ff1-8d90-767dbe4b7930",  // Unique
      "strokes": [
        {"id": "c8c7bc83-8ed9-4dff-a410-b740ddf79990", ...},  // Unique
        {"id": "79b13eef-deb9-4b41-a4c8-e0d84c9f38c3", ...}   // Unique
      ]
    }
  ]
}
```

**✅ Pass if:** All IDs are valid UUIDs and unique

---

## Test 6: localStorage Auto-Migration ✅

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Paste and run this code:

```javascript
// Inject V1 document directly into localStorage
const v1Doc = {
  version: 1,
  id: "browser-test-v1",
  title: "Browser LocalStorage Test",
  pageSize: "a3",
  orientation: "portrait",
  pages: [{ background: "dots", strokes: [] }],
  createdAt: new Date().toISOString(),
  lastModified: new Date().toISOString()
};

const drawings = JSON.parse(localStorage.getItem('samsung_notes_drawings') || '[]');
drawings.push(v1Doc);
localStorage.setItem('samsung_notes_drawings', JSON.stringify(drawings));

console.log('✅ V1 document injected into localStorage');
```

4. Refresh the page (F5)
5. Check Console for migration log:
   - **Expected:** `Migrating document "Browser LocalStorage Test" from V1 to V2`

6. Verify File Hub shows "Browser LocalStorage Test"
7. Open it → verify A3 Portrait with dots background
8. Export → verify V2 format

**✅ Pass if:** V1 document auto-migrated on page load

---

## Test 7: Drag & Drop Import ✅

1. Open File Hub
2. Drag `test_v1_drawing.samsungnote.json` from your file system
3. Drop onto the app window

**Expected Result:**
- ✅ Toast: "Imported: V1 Test Drawing (migrated from V1)"
- ✅ File appears in grid

**✅ Pass if:** Drag-drop import works with V1 → V2 migration

---

## Test 8: Backward Compatibility ✅

This test verifies old drawings still work:

1. If you have any drawings from before Phase 1, open them
2. Verify they render correctly
3. Export them
4. Verify exported file is V2 format
5. All strokes/pages should be intact

**✅ Pass if:** No data loss, seamless upgrade

---

## 🎯 Expected Results Summary

| Test | What It Verifies | Status |
|------|------------------|--------|
| 1 | New drawings use V2 | ⏳ |
| 2 | V1 import auto-migrates | ⏳ |
| 3 | Zoom/pan state persists | ⏳ |
| 4 | Per-page configuration | ⏳ |
| 5 | Unique IDs generated | ⏳ |
| 6 | localStorage auto-migration | ⏳ |
| 7 | Drag-drop import works | ⏳ |
| 8 | Backward compatibility | ⏳ |

---

## ✅ All Tests Pass?

If all 8 tests pass:
1. Mark them ✅ in the table above
2. Report back: "Phase 1 verified ✅"
3. Ready to proceed to Phase 2

## ❌ Any Test Fails?

If any test fails:
1. Note which test number
2. Describe what happened vs. what was expected
3. Check browser console for errors
4. Share error messages

---

## Debug Commands (if needed)

Open DevTools Console and run:

```javascript
// Check current schema version
const drawings = JSON.parse(localStorage.getItem('samsung_notes_drawings'));
console.log(drawings.map(d => ({
  title: d.title,
  schema: d.schemaVersion || d.version || 'unknown'
})));

// Clear all data (start fresh)
localStorage.removeItem('samsung_notes_drawings');
location.reload();

// Export all localStorage data
console.log(JSON.stringify(
  JSON.parse(localStorage.getItem('samsung_notes_drawings')),
  null,
  2
));
```

---

**Ready to test!** 🚀

Start with Test 1 and work through each one. Let me know how it goes!
