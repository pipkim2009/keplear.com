const fs = require('fs');
const path = require('path');

const content = `import { Innertube } from 'youtubei.js';
import vm from 'node:vm';

async function main() {
  console.log('Initializing InnerTube with JS evaluator...');
  
  const yt = await Innertube.create({
    enable_safety_mode: false,
    generate_session_locally: true,
    evaluate: (code) => {
      return vm.runInNewContext(code);
    }
  });
  
  const videoId = 'dQw4w9WgXcQ';
  
  // TEST 1: Decipher the muxed format (itag=18) with evaluator
  console.log('');
  console.log('=== TEST 1: Muxed format with JS evaluator ===');
  const info = await yt.getBasicInfo(videoId);
  const sd = info.streaming_data;
  
  const muxedFormats = sd.formats || [];
  console.log('Muxed formats: ' + muxedFormats.length);
  
  if (muxedFormats.length > 0) {
    const muxed = muxedFormats[0];
    console.log('itag=' + muxed.itag + ' mime=' + muxed.mime_type);
    
    try {
      const url = await muxed.decipher(yt.session.player);
      const urlStr = typeof url === 'object' ? url.toString() : String(url);
      console.log('Deciphered! URL starts with: ' + urlStr.slice(0, 80));
      
      if (urlStr.startsWith('http')) {
        const urlObj = new URL(urlStr);
        console.log('Host: ' + urlObj.hostname);
        console.log('Has n param: ' + urlObj.searchParams.has('n'));
        
        console.log('');
        console.log('Downloading first 512KB...');
        const startTime = Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(urlStr, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Range': 'bytes=0-524287'
          }
        });
        clearTimeout(timeout);
        console.log('HTTP ' + res.status);
        
        if (res.ok || res.status === 206) {
          const buf = await res.arrayBuffer();
          const elapsed = Date.now() - startTime;
          console.log('Got ' + buf.byteLength + ' bytes in ' + elapsed + 'ms');
          console.log('Speed: ' + (buf.byteLength / 1024 / (elapsed / 1000)).toFixed(1) + ' KB/s');
          if (buf.byteLength > 130000) {
            console.log('SUCCESS! Muxed format works, bypassed 127KB throttle!');
          } else {
            console.log('Muxed format throttled :(');
          }
        } else {
          console.log('HTTP error: ' + res.status);
        }
      }
    } catch (e) {
      console.log('Decipher error: ' + e.message);
    }
  }
  
  // TEST 2: Library download method
  console.log('');
  console.log('=== TEST 2: Library download method ===');
  try {
    console.log('Trying yt.download...');
    const stream = await yt.download(videoId, {
      type: 'audio',
      quality: 'bestefficiency',
    });
    
    let totalBytes = 0;
    const startTime = Date.now();
    for await (const chunk of stream) {
      totalBytes += chunk.length;
      if (totalBytes >= 524288) break;
    }
    const elapsed = Date.now() - startTime;
    console.log('Download got ' + totalBytes + ' bytes in ' + elapsed + 'ms');
    console.log('Speed: ' + (totalBytes / 1024 / (elapsed / 1000)).toFixed(1) + ' KB/s');
    if (totalBytes > 130000) {
      console.log('SUCCESS via download! Bypassed throttle!');
    } else {
      console.log('Download throttled :(');
    }
  } catch (e) {
    console.log('Download error: ' + e.message);
  }
  
  // TEST 3: Direct ANDROID client API call
  console.log('');
  console.log('=== TEST 3: Direct ANDROID API call ===');
  try {
    const apiUrl = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false&alt=json';
    const body = {
      videoId: videoId,
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: '19.02.39',
          androidSdkVersion: 34,
          hl: 'en',
          gl: 'US',
        }
      }
    };
    
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/19.02.39 (Linux; U; Android 14) gzip',
        'X-YouTube-Client-Name': '3',
        'X-YouTube-Client-Version': '19.02.39',
      },
      body: JSON.stringify(body)
    });
    
    console.log('API response: HTTP ' + res.status);
    
    if (res.ok) {
      const data = await res.json();
      const asd = data.streamingData;
      if (asd) {
        console.log('formats: ' + (asd.formats?.length || 0));
        console.log('adaptiveFormats: ' + (asd.adaptiveFormats?.length || 0));
        console.log('serverAbrStreamingUrl: ' + !!asd.serverAbrStreamingUrl);
        
        const audioAf = (asd.adaptiveFormats || []).filter(f => f.mimeType?.startsWith('audio/'));
        console.log('Audio adaptive: ' + audioAf.length);
        const audioWithUrl = audioAf.filter(f => f.url);
        console.log('Audio with URL: ' + audioWithUrl.length);
        
        if (audioWithUrl.length > 0) {
          const af = audioWithUrl[0];
          console.log('Using: itag=' + af.itag + ' ' + af.mimeType);
          
          console.log('');
          console.log('Downloading first 512KB...');
          const startTime = Date.now();
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          const dlRes = await fetch(af.url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'com.google.android.youtube/19.02.39 (Linux; U; Android 14) gzip',
              'Range': 'bytes=0-524287'
            }
          });
          clearTimeout(timeout);
          console.log('HTTP ' + dlRes.status);
          
          if (dlRes.ok || dlRes.status === 206) {
            const buf = await dlRes.arrayBuffer();
            const elapsed = Date.now() - startTime;
            console.log('Got ' + buf.byteLength + ' bytes in ' + elapsed + 'ms');
            console.log('Speed: ' + (buf.byteLength / 1024 / (elapsed / 1000)).toFixed(1) + ' KB/s');
            if (buf.byteLength > 130000) {
              console.log('SUCCESS! Android client bypassed throttle!');
            } else {
              console.log('Android client throttled :(');
            }
          }
        } else {
          const audioWithCipher = audioAf.filter(f => f.signatureCipher);
          console.log('Audio with signatureCipher: ' + audioWithCipher.length);
        }
      } else {
        console.log('No streamingData');
        if (data.playabilityStatus) {
          console.log('Status: ' + data.playabilityStatus.status + ' - ' + (data.playabilityStatus.reason || '').slice(0, 150));
        }
      }
    }
  } catch (e) {
    console.log('API error: ' + e.message);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
`;

fs.writeFileSync(path.join('C:', 'Users', 'e4ell', 'websites', 'keplear.com', 'scratchpad', 'test-youtubei-throttle.mjs'), content);
console.log('Script written successfully');
