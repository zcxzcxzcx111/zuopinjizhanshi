import COS from 'cos-js-sdk-v5';

// Initialize the COS instance with an STS token provider
export const cos = new COS({
  // getAuthorization is called whenever an API requires a signature
  getAuthorization: function (options, callback) {
    // Determine the base URL for the API (handles both local dev and production)
    const apiUrl = '/api/sts';
    
    fetch(apiUrl)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch STS credentials');
        return res.json();
      })
      .then(data => {
        const credentials = data.credentials;
        if (!data || !credentials) {
          throw new Error('credentials invalid');
        }
        callback({
          TmpSecretId: credentials.tmpSecretId,
          TmpSecretKey: credentials.tmpSecretKey,
          SecurityToken: credentials.sessionToken,
          StartTime: data.startTime,
          ExpiredTime: data.expiredTime,
        });
      })
      .catch(err => {
        console.error('COS getAuthorization error:', err);
      });
  }
});

/**
 * Uploads a file (Blob or File) to Tencent Cloud COS.
 * Returns the public HTTPS URL of the uploaded image.
 */
export async function uploadToCOS(file: Blob, filename: string): Promise<string> {
  const bucket = process.env.EXPO_PUBLIC_TENCENT_BUCKET || process.env.NEXT_PUBLIC_TENCENT_BUCKET;
  const region = process.env.EXPO_PUBLIC_TENCENT_REGION || process.env.NEXT_PUBLIC_TENCENT_REGION;

  if (!bucket || !region) {
    throw new Error('Tencent Cloud Bucket or Region not configured in environment variables.');
  }

  return new Promise((resolve, reject) => {
    cos.uploadFile({
      Bucket: bucket,
      Region: region,
      Key: `uploads/${Date.now()}-${filename}`,
      Body: file,
      SliceSize: 1024 * 1024 * 5, // use multipart if > 5MB
    }, (err, data) => {
      if (err) {
        console.error('COS Upload Error:', err);
        reject(err);
      } else {
        // Construct the HTTPS URL directly
        const url = `https://${data.Location}`;
        resolve(url);
      }
    });
  });
}
