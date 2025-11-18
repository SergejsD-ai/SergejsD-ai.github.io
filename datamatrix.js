// Import the bwip-js library as an ES6 module
import { toCanvas } from 'https://cdn.jsdelivr.net/npm/bwip-js@4.2.2/lib/bwip-js.js';

// Export the DataMatrix generation function
export async function generateDatamatrixCode(dataString) {
    return new Promise((resolve, reject) => {
        try {
            // Create canvas element
            const canvas = document.createElement('canvas');
            
            // Use the imported bwip-js library to generate DataMatrix
            toCanvas(canvas, {
                bcid: 'datamatrix',       // Barcode type
                text: dataString,         // Text to encode
                scale: 3,                 // 3x scaling factor
                width: 200,               // Image width
                height: 200,              // Image height
                includetext: false,       // Don't show human-readable text
            }, function (err) {
                if (err) {
                    reject(new Error(`DataMatrix generation failed: ${err.message}`));
                } else {
                    // Convert canvas to data URL
                    const dataUrl = canvas.toDataURL('image/png');
                    resolve(dataUrl);
                }
            });
            
        } catch (error) {
            reject(new Error(`DataMatrix generation failed: ${error.message}`));
        }
    });
}