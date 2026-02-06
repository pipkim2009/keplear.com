const { info } = require('youtube-info-streams');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CHUNK_SIZES = [
  { label: '4KB',   bytes: 4095 },
  { label: '16KB',  bytes: 16383 },
  { label: '64KB',  bytes: 65535 },
  { label: '256KB', bytes: 262143 },
  { label: '512KB', bytes: 524287 },
  { label: '1MB',   bytes: 1048575 },
  { label: '2MB',   bytes: 2097151 },
  { label: '4MB',   bytes: 4194303 },
];

async function main() {
  console.log('=== YouTube Range Header Chunk Size Test ===\n');
  console.log('Fetching stream info for video _VUKfrA9oLQ ...\n');

  const data = await info('_VUKfrA9oLQ');
  const audioStreams = data.formats.filter(f => f.mimeType && f.mimeType.startsWith('audio/'));
  const mp4s = audioStreams.filter(s => s.mimeType.includes('audio/mp4'));
  mp4s.sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0));
  const stream = mp4s[0];

  if (!stream) {
    console.error('No audio/mp4 stream found!');
    process.exit(1);
  }

  // Extract clen from URL params
  const streamUrl = new URL(stream.url);
  const clen = streamUrl.searchParams.get('clen');

  console.log('--- Stream Info ---');
  console.log('  mimeType : ' + stream.mimeType);
  console.log('  bitrate  : ' + stream.bitrate);
  console.log('  clen     : ' + clen);
  console.log('  url      : ' + stream.url.substring(0, 120) + '...');
  console.log('');

  // Step 3: Probe request to get total file size
  console.log('--- Probe Request (Range: bytes=0-1) ---');
  try {
    const probeRes = await fetch(stream.url, {
      headers: {
        'User-Agent': UA,
        'Range': 'bytes=0-1',
      },
    });
    const contentRange = probeRes.headers.get('content-range');
    const contentLength = probeRes.headers.get('content-length');
    const probeBody = await probeRes.arrayBuffer();
    console.log('  Status         : ' + probeRes.status);
    console.log('  Content-Range  : ' + contentRange);
    console.log('  Content-Length : ' + contentLength);
    console.log('  Bytes received : ' + probeBody.byteLength);

    // Parse total size from Content-Range: bytes 0-1/TOTAL
    let totalSize = null;
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)/);
      if (match) totalSize = parseInt(match[1], 10);
    }
    if (totalSize) {
      console.log('  Total file size: ' + totalSize + ' bytes (' + (totalSize / 1024 / 1024).toFixed(2) + ' MB)');
    }
    console.log('');
  } catch (err) {
    console.error('  Probe FAILED: ' + err.message + '\n');
  }

  // Step 4: Test each chunk size
  console.log('--- Chunk Size Tests ---');
  console.log('Label'.padEnd(8) + ' | ' + 'Range End'.padEnd(12) + ' | ' + 'Status'.padEnd(8) + ' | ' + 'Bytes Recv'.padEnd(12) + ' | Result');
  console.log('-'.repeat(70));

  for (const { label, bytes } of CHUNK_SIZES) {
    const rangeHeader = 'bytes=0-' + bytes;
    try {
      const res = await fetch(stream.url, {
        headers: {
          'User-Agent': UA,
          'Range': rangeHeader,
        },
      });

      const body = await res.arrayBuffer();
      const status = res.status;
      const bytesReceived = body.byteLength;

      let result;
      if (status === 200 || status === 206) {
        result = 'SUCCESS';
      } else if (status === 403) {
        result = 'FORBIDDEN';
      } else {
        result = 'OTHER (' + status + ')';
      }

      console.log(
        label.padEnd(8) + ' | ' + bytes.toString().padEnd(12) + ' | ' + status.toString().padEnd(8) + ' | ' + bytesReceived.toString().padEnd(12) + ' | ' + result
      );

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(
        label.padEnd(8) + ' | ' + bytes.toString().padEnd(12) + ' | ' + 'ERR'.padEnd(8) + ' | ' + 'N/A'.padEnd(12) + ' | ' + err.message
      );
    }
  }

  console.log('\n=== Test Complete ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
