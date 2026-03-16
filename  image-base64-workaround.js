// ============================================================
// WORKAROUND: Store images as base64 in Firestore
// This bypasses Firebase Storage subscription requirement
// ============================================================

// Convert uploaded image file to base64 string
async function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    // Validate file size (max 1MB to avoid Firestore limits)
    if (file.size > 1024 * 1024) {
      reject(new Error('Image too large. Please use an image under 1MB.'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      const base64 = reader.result;
      resolve(base64);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
    
    reader.readAsDataURL(file);
  });
}

// Compress image before converting to base64
async function compressAndConvertImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Create canvas for compression
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Target size: max 800x800px
        let width = img.width;
        let height = img.height;
        const maxSize = 800;
        
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 (JPEG, 85% quality)
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        
        // Check final size
        const sizeInKB = Math.round((base64.length * 3) / 4 / 1024);
        if (sizeInKB > 900) {
          reject(new Error(`Image still too large (${sizeInKB}KB). Try a smaller image.`));
        } else {
          resolve(base64);
        }
      };
      
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Usage example:
/*
const coverFile = input.files[0];
try {
  const base64Cover = await compressAndConvertImage(coverFile);
  // Store base64Cover directly in Firestore
  // playlistData.coverURL = base64Cover;
} catch (err) {
  console.error(err.message);
}
*/