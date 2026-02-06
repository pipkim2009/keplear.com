const ytdl = require('@distube/ytdl-core');

async function test() {
  try {
    console.log('Getting video info...');
    const info = await ytdl.getInfo('_VUKfrA9oLQ');
    
    // List audio-only formats
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    console.log(`Found ${audioFormats.length} audio-only formats:`);
    audioFormats.forEach(f => {
      console.log(`  itag=${f.itag} ${f.mimeType} bitrate=${f.audioBitrate}kbps contentLength=${f.contentLength}`);
    });
    
    // Pick smallest
    const sorted = [...audioFormats].sort((a, b) => (parseInt(a.contentLength || '0') || 999999999) - (parseInt(b.contentLength || '0') || 999999999));
    const smallest = sorted[0];
    console.log(`\nPicked: itag=${smallest.itag} ${smallest.mimeType} size=${smallest.contentLength}`);
    
    // Download first 1MB
    console.log('\nDownloading first 1MB...');
    const stream = ytdl.downloadFromInfo(info, { format: smallest });
    
    let totalBytes = 0;
    const MAX_BYTES = 1024 * 1024; // 1MB
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        stream.destroy();
        console.log(`Timeout - got ${totalBytes} bytes`);
        resolve();
      }, 30000);
      
      stream.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes % (100 * 1024) < chunk.length) {
          console.log(`  Downloaded: ${(totalBytes / 1024).toFixed(0)}KB`);
        }
        if (totalBytes >= MAX_BYTES) {
          stream.destroy();
          clearTimeout(timeout);
          console.log(`\nSUCCESS! Downloaded ${(totalBytes / 1024).toFixed(0)}KB (> 127KB throttle limit)`);
          resolve();
        }
      });
      
      stream.on('error', (err) => {
        clearTimeout(timeout);
        console.log(`Error: ${err.message}`);
        console.log(`Got ${totalBytes} bytes before error`);
        reject(err);
      });
      
      stream.on('end', () => {
        clearTimeout(timeout);
        console.log(`Stream ended. Total: ${(totalBytes / 1024).toFixed(0)}KB`);
        resolve();
      });
    });
  } catch (e) {
    console.error('Failed:', e.message);
    if (e.stack) console.error(e.stack.split('\n').slice(0, 5).join('\n'));
  }
}

test().then(() => process.exit(0)).catch(() => process.exit(1));
