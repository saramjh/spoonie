-- Add thumbnail_index column to items table
-- This stores which image in the image_urls array should be used as the thumbnail

ALTER TABLE items ADD COLUMN thumbnail_index INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN items.thumbnail_index IS 'Index of the thumbnail image in the image_urls array (0-based)';

-- Update existing records to have thumbnail_index = 0 (first image as thumbnail)
UPDATE items SET thumbnail_index = 0 WHERE thumbnail_index IS NULL;

-- Set NOT NULL constraint after updating existing records
ALTER TABLE items ALTER COLUMN thumbnail_index SET NOT NULL; 