import https from 'https';

const log = (label, value) => console.log(`${label}: ${value}`);

function httpsRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  try {
    const androidUA = 'com.google.android.youtube/19.02.39 (Linux; U; Android 14) gzip';
    const videoId = 'dQw4w9WgXcQ';
    
    // Step 1: Get audio stream via InnerTube API
    log('Step 1', 'Requesting audio streams from InnerTube API');
    const playerResponse = await httpsRequest({
      hostname: 'www.youtube.com',
      path: '/youtubei/v1/player?prettyPrint=false&alt=json',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': androidUA,
        'X-YouTube-Client-Name': '3',
        'X-YouTube-Client-Version': '19.02.39'
      }
    }, {
      videoId,
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: '19.02.39',
          androidSdkVersion: 34,
          hl: 'en',
          gl: 'US'
        }
      }
    });

    if (playerResponse.status !== 200) {
      throw new Error(`InnerTube API returned ${playerResponse.status}`);
    }

    const player = JSON.parse(playerResponse.body);
    const formats = player?.streamingData?.adaptiveFormats || [];
    const audioFormats = formats.filter(f => f.mimeType?.includes('audio'));
    
    if (audioFormats.length === 0) {
      throw new Error('No audio formats found');
    }

    // Step 2: Pick smallest by contentLength
    log('Step 2', `Found ${audioFormats.length} audio formats`);
    const smallest = audioFormats.reduce((min, f) => 
      (f.contentLength < min.contentLength) ? f : min
    );
    
    const audioUrl = smallest.url;
    log('Selected audio format contentLength', smallest.contentLength);

    // Step 3: Parse clen from URL
    const clenMatch = audioUrl.match(/[?&]clen=(\d+)/);
    if (!clenMatch) throw new Error('clen not found in URL');
    const clen = parseInt(clenMatch[1]);
    log('Parsed clen from URL', clen);

    // Step 4: Download with Range header
    const rangeHeader = `bytes=0-${clen - 1}`;
    log('Range header', rangeHeader);
    
    const audioUrlObj = new URL(audioUrl);
    const downloadResponse = await httpsRequest({
      hostname: audioUrlObj.hostname,
      path: audioUrlObj.pathname + audioUrlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': androidUA,
        'Range': rangeHeader
      }
    });

    // Step 5: Log results
    log('HTTP Status', downloadResponse.status);
    log('Bytes received', downloadResponse.body.length);
    log('Expected bytes', clen);
    log('Match', downloadResponse.body.length === clen ? 'YES' : 'NO');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
