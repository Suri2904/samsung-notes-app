import { migrateToCurrentSchema, detectSchemaVersion } from './schemaMigration';

const STORAGE_KEY = 'samsung_notes_drawings';

export const storage = {
  // Get all saved drawings (auto-migrates to current schema)
  getAllDrawings() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];

      const drawings = JSON.parse(data);

      // Auto-migrate any old format documents
      const migratedDrawings = drawings.map(drawing => {
        const version = detectSchemaVersion(drawing);
        if (version < 2) {
          console.log(`Migrating document "${drawing.title}" from V${version} to V2`);
          return migrateToCurrentSchema(drawing);
        }
        return drawing;
      });

      // Save migrated documents back to storage if any were migrated
      const hadMigrations = migratedDrawings.some((d, i) => d !== drawings[i]);
      if (hadMigrations) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedDrawings));
      }

      return migratedDrawings;
    } catch (err) {
      console.error('Failed to load drawings:', err);
      return [];
    }
  },

  // Save a drawing (ensures V2 schema)
  saveDrawing(drawing) {
    try {
      const drawings = this.getAllDrawings();
      const existingIndex = drawings.findIndex(d => d.id === drawing.id);

      // Ensure schema V2 and update timestamp
      const updatedDrawing = {
        ...drawing,
        schemaVersion: 2,
        updatedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        drawings[existingIndex] = updatedDrawing;
      } else {
        drawings.push(updatedDrawing);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(drawings));
      return updatedDrawing;
    } catch (err) {
      console.error('Failed to save drawing:', err);
      throw err;
    }
  },

  // Delete a drawing
  deleteDrawing(id) {
    try {
      const drawings = this.getAllDrawings();
      const filtered = drawings.filter(d => d.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.error('Failed to delete drawing:', err);
      throw err;
    }
  },

  // Get a single drawing by ID
  getDrawing(id) {
    const drawings = this.getAllDrawings();
    return drawings.find(d => d.id === id);
  },

  // Duplicate a drawing
  duplicateDrawing(id) {
    try {
      const original = this.getDrawing(id);
      if (!original) return null;

      const duplicate = {
        ...original,
        id: crypto.randomUUID(),
        title: `${original.title} (Copy)`,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      return this.saveDrawing(duplicate);
    } catch (err) {
      console.error('Failed to duplicate drawing:', err);
      throw err;
    }
  },

  // Rename a drawing
  renameDrawing(id, newTitle) {
    try {
      const drawing = this.getDrawing(id);
      if (!drawing) return null;

      return this.saveDrawing({
        ...drawing,
        title: newTitle
      });
    } catch (err) {
      console.error('Failed to rename drawing:', err);
      throw err;
    }
  },

  // Get storage size
  getStorageSize() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? new Blob([data]).size : 0;
    } catch {
      return 0;
    }
  },

  // Clear all data
  clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear storage:', err);
      throw err;
    }
  }
};
