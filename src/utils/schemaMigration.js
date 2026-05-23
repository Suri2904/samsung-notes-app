/**
 * Schema Migration Utility
 * Handles conversion between old and new document formats
 */

const CURRENT_SCHEMA_VERSION = 2;

/**
 * Detect schema version
 */
export const detectSchemaVersion = (document) => {
  // V2 has explicit schema field and zoom/pan at root
  if (document.schemaVersion === 2 || (document.zoom !== undefined && document.pan !== undefined)) {
    return 2;
  }
  // V1 has version field and pageSize/orientation at root
  if (document.version === 1 || document.pageSize !== undefined) {
    return 1;
  }
  // Unknown/corrupted
  return 0;
};

/**
 * Migrate V1 schema to V2
 * V1: { version, id, title, pageSize, orientation, pages: [{ strokes, background, imageData }] }
 * V2: { schemaVersion, id, title, zoom, pan, currentPageIndex, pages: [{ id, size, orientation, backgroundPattern, strokes: [{ id, tool, color, size, points }] }] }
 */
export const migrateV1ToV2 = (v1Doc) => {
  const v2Doc = {
    schemaVersion: 2,
    id: v1Doc.id || crypto.randomUUID(),
    title: v1Doc.title || 'Untitled Drawing',
    createdAt: v1Doc.createdAt || new Date().toISOString(),
    updatedAt: v1Doc.lastModified || v1Doc.updatedAt || new Date().toISOString(),
    zoom: 1,
    pan: { x: 0, y: 0 },
    currentPageIndex: 0,
    pages: []
  };

  // Migrate pages
  const v1Pages = v1Doc.pages || [null];
  v2Doc.pages = v1Pages.map((v1Page, index) => {
    const v2Page = {
      id: crypto.randomUUID(),
      size: (v1Doc.pageSize || 'a4').toUpperCase(), // a4 → A4
      orientation: v1Doc.orientation || 'landscape',
      backgroundPattern: v1Page?.background || 'plain',
      strokes: []
    };

    // Migrate strokes if they exist
    if (v1Page && v1Page.strokes && Array.isArray(v1Page.strokes)) {
      v2Page.strokes = v1Page.strokes.map(stroke => {
        // Handle both old format (with points) and incomplete strokes
        const points = stroke.points || [];
        return {
          id: crypto.randomUUID(),
          tool: stroke.tool || 'pen',
          color: stroke.color || '#000000',
          size: stroke.size || 'M',
          points: points.map(p => ({
            x: p.x || 0,
            y: p.y || 0,
            pressure: p.pressure !== undefined ? p.pressure : 0.5
          }))
        };
      });
    }

    return v2Page;
  });

  return v2Doc;
};

/**
 * Auto-migrate any document to current schema
 */
export const migrateToCurrentSchema = (document) => {
  if (!document) {
    throw new Error('Invalid document: null or undefined');
  }

  const version = detectSchemaVersion(document);

  switch (version) {
    case 2:
      // Already V2, just ensure schemaVersion field exists
      return {
        ...document,
        schemaVersion: 2,
        updatedAt: document.updatedAt || document.lastModified || new Date().toISOString()
      };

    case 1:
      // Migrate V1 to V2
      return migrateV1ToV2(document);

    case 0:
    default:
      // Unknown format - try best-effort migration
      console.warn('Unknown document format, attempting best-effort migration');
      return migrateV1ToV2(document);
  }
};

/**
 * Validate V2 schema structure
 */
export const validateV2Schema = (document) => {
  const errors = [];

  // Required root fields
  if (!document.id) errors.push('Missing required field: id');
  if (!document.title) errors.push('Missing required field: title');
  if (!document.createdAt) errors.push('Missing required field: createdAt');
  if (!document.updatedAt) errors.push('Missing required field: updatedAt');
  if (document.zoom === undefined) errors.push('Missing required field: zoom');
  if (!document.pan || document.pan.x === undefined || document.pan.y === undefined) {
    errors.push('Missing or invalid field: pan');
  }
  if (document.currentPageIndex === undefined) errors.push('Missing required field: currentPageIndex');
  if (!Array.isArray(document.pages)) errors.push('Missing or invalid field: pages');

  // Validate pages
  if (Array.isArray(document.pages)) {
    document.pages.forEach((page, i) => {
      if (!page.id) errors.push(`Page ${i}: Missing required field: id`);
      if (!page.size) errors.push(`Page ${i}: Missing required field: size`);
      if (!page.orientation) errors.push(`Page ${i}: Missing required field: orientation`);
      if (!page.backgroundPattern) errors.push(`Page ${i}: Missing required field: backgroundPattern`);
      if (!Array.isArray(page.strokes)) errors.push(`Page ${i}: Missing or invalid field: strokes`);

      // Validate strokes
      if (Array.isArray(page.strokes)) {
        page.strokes.forEach((stroke, j) => {
          if (!stroke.id) errors.push(`Page ${i}, Stroke ${j}: Missing required field: id`);
          if (!stroke.tool) errors.push(`Page ${i}, Stroke ${j}: Missing required field: tool`);
          if (!stroke.color) errors.push(`Page ${i}, Stroke ${j}: Missing required field: color`);
          if (!stroke.size) errors.push(`Page ${i}, Stroke ${j}: Missing required field: size`);
          if (!Array.isArray(stroke.points)) {
            errors.push(`Page ${i}, Stroke ${j}: Missing or invalid field: points`);
          }
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Create empty V2 document
 */
export const createEmptyDocument = (title = 'Untitled Drawing') => {
  return {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    zoom: 1,
    pan: { x: 0, y: 0 },
    currentPageIndex: 0,
    pages: [
      {
        id: crypto.randomUUID(),
        size: 'A4',
        orientation: 'landscape',
        backgroundPattern: 'plain',
        strokes: []
      }
    ]
  };
};

export default {
  CURRENT_SCHEMA_VERSION,
  detectSchemaVersion,
  migrateV1ToV2,
  migrateToCurrentSchema,
  validateV2Schema,
  createEmptyDocument
};
