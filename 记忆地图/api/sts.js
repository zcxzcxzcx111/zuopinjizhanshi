const STS = require('qcloud-cos-sts');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { 
    TENCENT_SECRET_ID, 
    TENCENT_SECRET_KEY, 
    NEXT_PUBLIC_TENCENT_BUCKET, 
    NEXT_PUBLIC_TENCENT_REGION,
    EXPO_PUBLIC_TENCENT_BUCKET,
    EXPO_PUBLIC_TENCENT_REGION
  } = process.env;

  const bucket = NEXT_PUBLIC_TENCENT_BUCKET || EXPO_PUBLIC_TENCENT_BUCKET;
  const region = NEXT_PUBLIC_TENCENT_REGION || EXPO_PUBLIC_TENCENT_REGION;

  if (!TENCENT_SECRET_ID || !TENCENT_SECRET_KEY || !bucket || !region) {
    console.error('Missing Tencent Cloud configuration in environment variables.');
    return res.status(500).json({ error: 'Tencent Cloud configuration missing' });
  }

  const appId = bucket.substr(bucket.lastIndexOf('-') + 1);

  const policy = {
    version: '2.0',
    statement: [{
      action: [
        'name/cos:PutObject',
        'name/cos:PostObject',
        'name/cos:InitiateMultipartUpload',
        'name/cos:ListMultipartUploads',
        'name/cos:ListParts',
        'name/cos:UploadPart',
        'name/cos:CompleteMultipartUpload',
        'name/cos:AbortMultipartUpload'
      ],
      effect: 'allow',
      principal: { qcs: ['*'] },
      resource: [
        `qcs::cos:${region}:uid/${appId}:${bucket}/*`
      ],
    }],
  };

  try {
    const data = await new Promise((resolve, reject) => {
      STS.getCredential({
        secretId: TENCENT_SECRET_ID,
        secretKey: TENCENT_SECRET_KEY,
        policy: policy,
        durationSeconds: 1800,
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
    
    res.status(200).json(data);
  } catch (error) {
    console.error('STS Error:', error);
    res.status(500).json({ error: 'Failed to get STS credential' });
  }
}
