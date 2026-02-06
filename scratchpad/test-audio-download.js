const yt = require('youtube-info-streams');
const https = require('https');
const http = require('http');

const VIDEO_ID = '_VUKfrA9oLQ';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const CHUNK_SIZE = 256 * 1024;
const MAX_DOWNLOAD = 10 * 1024 * 1024;

function parseClenFromUrl(url) {
  const match = url.match(/[&?]clen=(\d+)/);
  if (match) return parseInt(match[1], 10);
  return null;
}

function fetchRange(url, rangeHeader) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT, 'Range': rangeHeader },
    };
    const req = transport.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('Request timed out')));
    req.end();
  });
}

async function main() {
  console.log('=== Audio Download Pipeline Test ===');
  console.log('Video ID: ' + VIDEO_ID);
  console.log('');

  console.log('[Step 1] Fetching stream info...');
  const videoInfo = await yt.info(VIDEO_ID);
  const sd = videoInfo.player_response && videoInfo.player_response.streamingData;
  if (!sd) throw new Error('No streamingData found');
  const adaptiveFormats = sd.adaptiveFormats || [];
  const formats = sd.formats || [];
  const allFormats = [...adaptiveFormats, ...formats];
  console.log('  Total formats: ' + allFormats.length);
  console.log('  Adaptive formats: ' + adaptiveFormats.length);
  console.log('');

  console.log('[Step 2] Finding smallest audio stream...');
  const audioStreams = allFormats.filter(f => (f.mimeType || '').startsWith('audio/'));
  console.log('  Audio-only streams found: ' + audioStreams.length);
  if (audioStreams.length === 0) throw new Error('No audio-only streams found');

  for (const stream of audioStreams) {
    if (!stream.contentLength && stream.url) {
      const clen = parseClenFromUrl(stream.url);
      if (clen) { stream.contentLength = String(clen); stream._clenSource = 'parsed from URL'; }
    }
    if (!stream.contentLength) { stream.contentLength = '999999999'; stream._clenSource = 'unknown (defaulted)'; }
  }

  audioStreams.sort((a, b) => parseInt(a.contentLength) - parseInt(b.contentLength));
  console.log('  All audio streams (sorted by size):');
  for (let i = 0; i < audioStreams.length; i++) {
    const s = audioStreams[i];
    const sizeMB = (parseInt(s.contentLength) / (1024 * 1024)).toFixed(2);
    console.log('    [' + i + '] itag=' + s.itag + ' mime=' + s.mimeType + ' bitrate=' + s.bitrate + ' size=' + s.contentLength + ' (' + sizeMB + ' MB)');
  }

  const selected = audioStreams[0];
  console.log('');
  console.log('[Step 3] Selected stream details:');
  console.log('  mimeType:      ' + selected.mimeType);
  console.log('  bitrate:       ' + selected.bitrate);
  console.log('  contentLength: ' + selected.contentLength + ' bytes (' + (parseInt(selected.contentLength) / (1024 * 1024)).toFixed(2) + ' MB)');
  if (selected._clenSource) console.log('  clen source:   ' + selected._clenSource);
  console.log('  itag:          ' + selected.itag);
  console.log('');
  if (!selected.url) throw new Error('Selected stream has no URL');

  console.log('[Step 4] Starting chunked download...');
  const downloadUrl = selected.url;
  console.log('  Probing with Range: bytes=0-1 ...');
  const probe = await fetchRange(downloadUrl, 'bytes=0-1');
  console.log('  Probe status: ' + probe.statusCode);
  console.log('  Probe Content-Range: ' + probe.headers['content-range']);

  let totalSize = parseInt(selected.contentLength);
  if (probe.headers['content-range']) {
    const crMatch = probe.headers['content-range'].match(/\/(\d+)/);
    if (crMatch) {
      totalSize = parseInt(crMatch[1], 10);
      console.log('  Total size from Content-Range: ' + totalSize + ' bytes (' + (totalSize / (1024 * 1024)).toFixed(2) + ' MB)');
    }
  }

  const downloadLimit = Math.min(totalSize, MAX_DOWNLOAD);
  console.log('  Download limit (10MB cap): ' + downloadLimit + ' bytes (' + (downloadLimit / (1024 * 1024)).toFixed(2) + ' MB)');
  console.log('');

  const startTime = Date.now();
  const buffers = [];
  let downloaded = 0;
  let chunkNum = 0;

  while (downloaded < downloadLimit) {
    const rangeStart = downloaded;
    const rangeEnd = Math.min(downloaded + CHUNK_SIZE - 1, downloadLimit - 1);
    chunkNum++;
    const rangeHeader = 'bytes=' + rangeStart + '-' + rangeEnd;
    const resp = await fetchRange(downloadUrl, rangeHeader);
    if (resp.statusCode !== 206 && resp.statusCode !== 200) {
      console.error('  ERROR: Unexpected status ' + resp.statusCode + ' on chunk ' + chunkNum);
      break;
    }
    buffers.push(resp.body);
    downloaded += resp.body.length;
    console.log('  Chunk ' + String(chunkNum).padStart(3) + ': ' + rangeHeader.padEnd(30) + ' | received ' + resp.body.length + ' bytes | total ' + downloaded + ' bytes (' + (downloaded / (1024 * 1024)).toFixed(2) + ' MB)');
    if (resp.body.length === 0) { console.log('  Server returned 0 bytes, stopping.'); break; }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const finalBuffer = Buffer.concat(buffers);
  console.log('');
  console.log('[Step 5] Download complete:');
  console.log('  Total chunks:     ' + chunkNum);
  console.log('  Total downloaded:  ' + finalBuffer.length + ' bytes (' + (finalBuffer.length / (1024 * 1024)).toFixed(2) + ' MB)');
  console.log('  Time taken:       ' + elapsed + ' seconds');
  const speed = parseFloat(elapsed) > 0 ? ((finalBuffer.length / (1024 * 1024)) / parseFloat(elapsed)).toFixed(2) : 'N/A';
  console.log('  Avg speed:        ' + speed + ' MB/s');

  console.log('');
  console.log('[Step 6] Verification:');
  if (finalBuffer.length > 0) {
    console.log('  PASS: Buffer is non-empty (' + finalBuffer.length + ' bytes)');
    console.log('  First 16 bytes (hex): ' + finalBuffer.slice(0, 16).toString('hex'));
  } else {
    console.error('  FAIL: Buffer is empty!');
    process.exit(1);
  }
  console.log('');
  console.log('=== Test completed successfully ===');
}

main().catch(err => { console.error('FATAL ERROR: ' + err.message); console.error(err.stack); process.exit(1); });
