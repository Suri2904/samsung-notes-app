/**
 * Automated Schema Migration Test Suite
 * Run with: node test-migration.js
 */

import {
  detectSchemaVersion,
  migrateV1ToV2,
  migrateToCurrentSchema,
  validateV2Schema,
  createEmptyDocument
} from './src/utils/schemaMigration.js';
import fs from 'fs';

// Test colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
    passCount++;
  } catch (err) {
    console.log(`${RED}✗${RESET} ${name}`);
    console.log(`  ${RED}Error: ${err.message}${RESET}`);
    failCount++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals(actual, expected, field) {
  if (actual !== expected) {
    throw new Error(`${field}: expected ${expected}, got ${actual}`);
  }
}

function assertExists(value, field) {
  if (value === undefined || value === null) {
    throw new Error(`${field} is missing`);
  }
}

// Load test data
const v1Drawing = JSON.parse(fs.readFileSync('./test_v1_drawing.samsungnote.json', 'utf8'));

console.log(`${BLUE}======================================${RESET}`);
console.log(`${BLUE}  Schema Migration Test Suite${RESET}`);
console.log(`${BLUE}======================================${RESET}\n`);

// Test 1: Detect V1 Schema
test('Test 1: detectSchemaVersion() identifies V1', () => {
  const version = detectSchemaVersion(v1Drawing);
  assertEquals(version, 1, 'Schema version');
});

// Test 2: Migrate V1 to V2
let v2Drawing;
test('Test 2: migrateV1ToV2() converts successfully', () => {
  v2Drawing = migrateV1ToV2(v1Drawing);
  assertExists(v2Drawing, 'Migrated drawing');
});

// Test 3: V2 has schemaVersion field
test('Test 3: V2 document has schemaVersion: 2', () => {
  assertEquals(v2Drawing.schemaVersion, 2, 'schemaVersion');
});

// Test 4: V2 has zoom field
test('Test 4: V2 document has zoom field', () => {
  assertExists(v2Drawing.zoom, 'zoom');
  assertEquals(v2Drawing.zoom, 1, 'zoom default value');
});

// Test 5: V2 has pan field
test('Test 5: V2 document has pan field with x and y', () => {
  assertExists(v2Drawing.pan, 'pan');
  assertExists(v2Drawing.pan.x, 'pan.x');
  assertExists(v2Drawing.pan.y, 'pan.y');
  assertEquals(v2Drawing.pan.x, 0, 'pan.x default');
  assertEquals(v2Drawing.pan.y, 0, 'pan.y default');
});

// Test 6: V2 has currentPageIndex
test('Test 6: V2 document has currentPageIndex', () => {
  assertExists(v2Drawing.currentPageIndex, 'currentPageIndex');
  assertEquals(v2Drawing.currentPageIndex, 0, 'currentPageIndex default');
});

// Test 7: lastModified renamed to updatedAt
test('Test 7: lastModified renamed to updatedAt', () => {
  assertExists(v2Drawing.updatedAt, 'updatedAt');
  assert(!v2Drawing.lastModified, 'lastModified should not exist');
});

// Test 8: Pages have IDs
test('Test 8: All pages have unique IDs', () => {
  assert(Array.isArray(v2Drawing.pages), 'pages is array');
  v2Drawing.pages.forEach((page, i) => {
    assertExists(page.id, `pages[${i}].id`);
    assert(page.id.length === 36, `pages[${i}].id is valid UUID`);
  });

  // Check uniqueness
  const ids = v2Drawing.pages.map(p => p.id);
  const uniqueIds = new Set(ids);
  assertEquals(uniqueIds.size, ids.length, 'Page IDs are unique');
});

// Test 9: Page size is uppercase
test('Test 9: Page size converted to uppercase (a4 → A4)', () => {
  v2Drawing.pages.forEach((page, i) => {
    assertEquals(page.size, 'A4', `pages[${i}].size`);
  });
});

// Test 10: background renamed to backgroundPattern
test('Test 10: background renamed to backgroundPattern', () => {
  assertEquals(v2Drawing.pages[0].backgroundPattern, 'ruled', 'pages[0].backgroundPattern');
  assertEquals(v2Drawing.pages[1].backgroundPattern, 'grid', 'pages[1].backgroundPattern');
  assert(!v2Drawing.pages[0].background, 'pages[0].background should not exist');
});

// Test 11: Strokes have IDs
test('Test 11: All strokes have unique IDs', () => {
  const allStrokeIds = [];
  v2Drawing.pages.forEach((page, pageIdx) => {
    page.strokes.forEach((stroke, strokeIdx) => {
      assertExists(stroke.id, `pages[${pageIdx}].strokes[${strokeIdx}].id`);
      assert(stroke.id.length === 36, `stroke ID is valid UUID`);
      allStrokeIds.push(stroke.id);
    });
  });

  // Check global uniqueness
  const uniqueIds = new Set(allStrokeIds);
  assertEquals(uniqueIds.size, allStrokeIds.length, 'All stroke IDs are unique');
});

// Test 12: Stroke data preserved
test('Test 12: Stroke data preserved correctly', () => {
  const firstStroke = v2Drawing.pages[0].strokes[0];
  assertEquals(firstStroke.tool, 'pen', 'stroke.tool');
  assertEquals(firstStroke.color, '#FF0000', 'stroke.color');
  assertEquals(firstStroke.size, 'M', 'stroke.size');
  assertEquals(firstStroke.points.length, 3, 'stroke.points.length');
  assertEquals(firstStroke.points[0].x, 100, 'stroke.points[0].x');
  assertEquals(firstStroke.points[0].pressure, 0.5, 'stroke.points[0].pressure');
});

// Test 13: imageData removed
test('Test 13: imageData field removed from V2', () => {
  v2Drawing.pages.forEach((page, i) => {
    assert(!page.imageData, `pages[${i}].imageData should not exist`);
  });
});

// Test 14: Validate V2 schema
test('Test 14: validateV2Schema() passes', () => {
  const validation = validateV2Schema(v2Drawing);
  if (!validation.valid) {
    console.log('Validation errors:', validation.errors);
  }
  assert(validation.valid, 'V2 schema validation');
});

// Test 15: Detect V2 schema
test('Test 15: detectSchemaVersion() identifies V2', () => {
  const version = detectSchemaVersion(v2Drawing);
  assertEquals(version, 2, 'Detected schema version');
});

// Test 16: migrateToCurrentSchema is idempotent
test('Test 16: migrateToCurrentSchema() on V2 is idempotent', () => {
  const v2Again = migrateToCurrentSchema(v2Drawing);
  assertEquals(v2Again.schemaVersion, 2, 'schemaVersion still 2');
  assertEquals(v2Again.id, v2Drawing.id, 'ID unchanged');
  assertEquals(v2Again.pages.length, v2Drawing.pages.length, 'Page count unchanged');
});

// Test 17: Create empty document
test('Test 17: createEmptyDocument() creates valid V2', () => {
  const empty = createEmptyDocument('Test Empty');
  assertEquals(empty.schemaVersion, 2, 'schemaVersion');
  assertEquals(empty.title, 'Test Empty', 'title');
  assertEquals(empty.zoom, 1, 'zoom');
  assertEquals(empty.currentPageIndex, 0, 'currentPageIndex');
  assertEquals(empty.pages.length, 1, 'pages length');
  assertExists(empty.pages[0].id, 'page ID');
  assertEquals(empty.pages[0].strokes.length, 0, 'empty strokes');
});

// Test 18: Unknown format migration
test('Test 18: Unknown format handled gracefully', () => {
  const unknown = { foo: 'bar' };
  try {
    const migrated = migrateToCurrentSchema(unknown);
    // Should attempt best-effort migration
    assertExists(migrated, 'Migrated unknown format');
  } catch (err) {
    assert(err.message.includes('Invalid document'), 'Rejects invalid document');
  }
});

// Test 19: Export V2 to file
test('Test 19: Export migrated V2 document', () => {
  const exported = JSON.stringify(v2Drawing, null, 2);
  fs.writeFileSync('./test_v2_output.samsungnote.json', exported);
  assert(fs.existsSync('./test_v2_output.samsungnote.json'), 'V2 file exported');
});

// Test 20: Re-import V2 file
test('Test 20: Re-import V2 file and validate', () => {
  const reimported = JSON.parse(fs.readFileSync('./test_v2_output.samsungnote.json', 'utf8'));
  assertEquals(detectSchemaVersion(reimported), 2, 'Reimported schema is V2');
  const validation = validateV2Schema(reimported);
  assert(validation.valid, 'Reimported document is valid');
});

// Results
console.log(`\n${BLUE}======================================${RESET}`);
console.log(`${GREEN}Passed: ${passCount}${RESET}`);
console.log(`${RED}Failed: ${failCount}${RESET}`);
console.log(`${BLUE}======================================${RESET}\n`);

if (failCount === 0) {
  console.log(`${GREEN}🎉 All tests passed!${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${RED}❌ Some tests failed${RESET}\n`);
  process.exit(1);
}
