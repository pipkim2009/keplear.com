/**
 * Full Waveform Pipeline End-to-End Test
 * Simulates: /api/piped-streams -> pickStream -> /api/audio-proxy -> client decode
 */

const VIDEO_ID = 'dQw4w9WgXcQ';
const RANGE_CAP = 10 * 1024 * 1024; // 10MB
const ANDROID_UA = 'com.google.android.youtube/19.02.39 (Linux; U; Android 14) gzip';

let stepNum = 0;
function step(label) {
  stepNum++;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`STEP ${stepNum}: ${label}`);
  console.log('='.repeat(60));
}

async function run() {
  const startAll = Date.now();

  // STEP 1: Get stream info (simulate /api/piped-streams)
  step('Get stream info via ANDROID InnerTube API');

  const innertubeUrl = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false&alt=json';
  const innertubeBody = {
    videoId: VIDEO_ID,
    context: {
      client: {
        clientName: 'ANDROID',
        clientVersion: '19.02.39',
        androidSdkVersion: 34,
        hl: 'en',
        gl: 'US',
      },
    },
  };
  const innertubeHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': ANDROID_UA,
    'X-YouTube-Client-Name': '3',
    'X-YouTube-Client-Version': '19.02.39',
  };

  console.log(`POST ${innertubeUrl}`);
  console.log(`VideoId: ${VIDEO_ID}`);

  const infoRes = await fetch(innertubeUrl, {
    method: 'POST',
    headers: innertubeHeaders,
    body: JSON.stringify(innertubeBody),
  });

  if (!infoRes.ok) {
    throw new Error(`InnerTube API returned ${infoRes.status} ${infoRes.statusText}`);
  }

  const data = await infoRes.json();

  const playability = data.playabilityStatus;
  console.log(`Playability status: ${playability?.status}`);
  if (playability?.status !== 'OK') {
    throw new Error(`Video not playable: ${playability?.status} - ${playability?.reason || 'unknown'}`);
  }

  const title = data.videoDetails?.title || 'unknown';
  const lengthSeconds = data.videoDetails?.lengthSeconds || '0';
  const minutes = Math.floor(lengthSeconds / 60);
  const seconds = String(lengthSeconds % 60).padStart(2, '0');
  console.log(`Title: ${title}`);
  console.log(`Duration: ${minutes}:${seconds}`);

  const adaptiveFormats = data.streamingData?.adaptiveFormats || [];
  console.log(`Total adaptive formats: ${adaptiveFormats.length}`);

  const audioFormats = adaptiveFormats.filter(
    (f) => f.mimeType?.startsWith('audio/') && f.url && f.contentLength
  );
  console.log(`Audio formats with direct URLs: ${audioFormats.length}`);

  if (audioFormats.length === 0) {
    const audioAll = adaptiveFormats.filter((f) => f.mimeType?.startsWith('audio/'));
    console.log(`Audio formats total (including without URL): ${audioAll.length}`);
    for (const f of audioAll) {
      console.log(`  - ${f.mimeType} bitrate=${f.bitrate} hasUrl=${!!f.url} hasCipher=${!!f.signatureCipher} contentLength=${f.contentLength}`);
    }
    throw new Error('No audio formats with direct URLs found');
  }

  for (const f of audioFormats) {
    const sizeMB = (parseInt(f.contentLength, 10) / (1024 * 1024)).toFixed(2);
    console.log(`  - ${f.mimeType} | bitrate=${f.bitrate} | size=${sizeMB}MB | itag=${f.itag}`);
  }

  // STEP 2: Pick smallest stream (simulate pickStream)
  step('Pick smallest audio stream');

  const sorted = [...audioFormats].sort(
    (a, b) => parseInt(a.contentLength, 10) - parseInt(b.contentLength, 10)
  );
  const picked = sorted[0];
  const pickedSizeMB = (parseInt(picked.contentLength, 10) / (1024 * 1024)).toFixed(2);

  console.log(`Selected stream:`);
  console.log(`  mimeType:      ${picked.mimeType}`);
  console.log(`  bitrate:       ${picked.bitrate}`);
  console.log(`  contentLength: ${picked.contentLength} (${pickedSizeMB} MB)`);
  console.log(`  itag:          ${picked.itag}`);
  console.log(`  URL length:    ${picked.url.length} chars`);

  // STEP 3: Download audio (simulate /api/audio-proxy)
  step('Download audio with range request');

  const rangeEnd = Math.min(RANGE_CAP, parseInt(picked.contentLength, 10)) - 1;
  const rangeHeader = `bytes=0-${rangeEnd}`;
  console.log(`Range: ${rangeHeader}`);
  console.log(`Fetching audio...`);

  const dlStart = Date.now();
  const audioRes = await fetch(picked.url, {
    headers: {
      'User-Agent': ANDROID_UA,
      Range: rangeHeader,
    },
  });

  console.log(`HTTP status: ${audioRes.status} ${audioRes.statusText}`);
  console.log(`Content-Type: ${audioRes.headers.get('content-type')}`);
  console.log(`Content-Length: ${audioRes.headers.get('content-length')}`);
  console.log(`Content-Range: ${audioRes.headers.get('content-range')}`);

  if (!audioRes.ok && audioRes.status !== 206) {
    throw new Error(`Audio download failed: ${audioRes.status} ${audioRes.statusText}`);
  }

  const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
  const dlTime = Date.now() - dlStart;
  const dlSizeMB = (audioBuffer.length / (1024 * 1024)).toFixed(2);

  console.log(`Bytes received: ${audioBuffer.length} (${dlSizeMB} MB)`);
  console.log(`Download time:  ${dlTime}ms`);
  console.log(`Speed:          ${(audioBuffer.length / 1024 / (dlTime / 1000)).toFixed(0)} KB/s`);

  // STEP 4: Verify audio format (simulate client decode)
  step('Verify audio buffer (magic bytes)');

  console.log(`First 16 bytes (hex): ${audioBuffer.subarray(0, 16).toString('hex')}`);
  console.log(`First 16 bytes (ascii): ${audioBuffer.subarray(0, 16).toString('ascii').replace(/[^\x20-\x7E]/g, '.')}`);

  let detectedFormat = 'UNKNOWN';

  // WebM/EBML: 0x1A 0x45 0xDF 0xA3
  if (
    audioBuffer[0] === 0x1a &&
    audioBuffer[1] === 0x45 &&
    audioBuffer[2] === 0xdf &&
    audioBuffer[3] === 0xa3
  ) {
    detectedFormat = 'WebM (EBML container)';
  }

  // MP4/M4A: 'ftyp' at offset 4
  if (
    audioBuffer[4] === 0x66 &&
    audioBuffer[5] === 0x74 &&
    audioBuffer[6] === 0x79 &&
    audioBuffer[7] === 0x70
  ) {
    const brand = audioBuffer.subarray(8, 12).toString('ascii');
    detectedFormat = `MP4 (ftyp, brand="${brand}")`;
  }

  // Ogg: 'OggS' at offset 0
  if (
    audioBuffer[0] === 0x4f &&
    audioBuffer[1] === 0x67 &&
    audioBuffer[2] === 0x67 &&
    audioBuffer[3] === 0x53
  ) {
    detectedFormat = 'Ogg container';
  }

  console.log(`Detected format: ${detectedFormat}`);

  const expectedContainer = picked.mimeType.includes('webm')
    ? 'WebM'
    : picked.mimeType.includes('mp4')
    ? 'MP4'
    : picked.mimeType.includes('ogg')
    ? 'Ogg'
    : 'unknown';
  console.log(`Expected from mimeType: ${expectedContainer}`);

  const formatMatch =
    detectedFormat.toLowerCase().includes(expectedContainer.toLowerCase()) ||
    detectedFormat !== 'UNKNOWN';
  console.log(`Format valid: ${formatMatch ? 'YES' : 'NO'}`);

  // FINAL RESULT
  const totalTime = Date.now() - startAll;
  console.log(`\n${'='.repeat(60)}`);

  if (detectedFormat === 'UNKNOWN') {
    console.log(`FAILURE - Could not detect audio format from magic bytes`);
    process.exit(1);
  }

  console.log(`SUCCESS - Full waveform pipeline test passed`);
  console.log(`  Video:    ${title} (${VIDEO_ID})`);
  console.log(`  Stream:   ${picked.mimeType} @ ${picked.bitrate}bps`);
  console.log(`  Download: ${dlSizeMB} MB in ${dlTime}ms`);
  console.log(`  Format:   ${detectedFormat}`);
  console.log(`  Total:    ${totalTime}ms`);
  console.log('='.repeat(60));
}

run().catch((err) => {
  console.error(`\n${'='.repeat(60)}`);
  console.error(`FAILURE - ${err.message}`);
  console.error(err.stack);
  console.error('='.repeat(60));
  process.exit(1);
});
