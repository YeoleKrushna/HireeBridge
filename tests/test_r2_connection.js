require("dotenv").config();

const {
  S3Client,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");

const endpoint = process.env.R2_ENDPOINT;
const bucket = process.env.R2_BUCKET_NAME;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
  console.error("Missing required R2 environment variables.");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function main() {
  try {
    const result = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        MaxKeys: 10,
      })
    );

    console.log("R2 connection: SUCCESS");
    console.log("Bucket:", bucket);
    console.log("Objects:", result.Contents?.length || 0);
  } catch (error) {
    console.error("R2 connection: FAILED");
    console.error(error.name || "UnknownError");
    console.error(error.message || error);
    process.exit(1);
  }
}

main();