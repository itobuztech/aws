import express, { Request, Response } from "express";
import { config } from "dotenv";
import * as fs from "fs";
import multer from "multer";
import {
  GetBucketAclCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

config();

const router = express.Router();

const client = new S3Client({
  region: process.env.S3_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

router.post(
  "/uploadFiles",
  upload.single("file"),
  async (req: Request, res: Response) => {
    const { s3_bucket_name } = req.body;

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileStream = fs.createReadStream("uploads/" + file.filename);

    try {
      const command = new PutObjectCommand({
        Bucket: s3_bucket_name,
        Key: `${file.filename}`,
        Body: fileStream,
      });

      const response = await client.send(command);
      res.status(200).json({
        message: "File uploaded successfully",
        fileName: file.filename,
        filePath: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_BUCKET_REGION}.amazonaws.com/${file.filename}`,
        response: response,
      });
    } catch (caught) {
      if (
        caught instanceof S3ServiceException &&
        caught.name === "EntityTooLarge"
      ) {
        return res.status(413).json({
          error: "File too large",
          message: "The file you are trying to upload is too large.",
          errorDetails: `Error from S3 while uploading object to ${process.env.S3_BUCKET_NAME}. \
          The object was too large. To upload objects larger than 5GB, use the S3 console (160GB max) \
          or the multipart upload API (5TB max).`,
        });
      } else if (caught instanceof S3ServiceException) {
        return res.status(500).json({
          error: "Failed to upload file",
          message: "An error occurred while uploading the file.",
          errorDetails: `Error from S3 while uploading object to ${process.env.S3_BUCKET_NAME}.  ${caught.name}: ${caught.message}`,
        });
      } else {
        // throw caught;
        return res.status(500).json({
          caught,
        });
      }
    }
  }
);

router.get("/:s3_bucket_name", async (req: Request, res: Response) => {
  const { s3_bucket_name } = req.params;
  const input: any = {
    Bucket: s3_bucket_name,
  };

  try {
    const command = new ListObjectsV2Command(input);
    const response: any = await client.send(command);

    console.log("Files listed:", response);

    if (response.Contents && response.Contents.length > 0) {
      const files = response.Contents.map((file: any) => ({
        Key: file.Key,
        LastModified: file.LastModified,
        Size: file.Size,
      }));
      res.status(200).json({
        message: `Files of the '${s3_bucket_name}' bucket listed successfully!`,
        files: files,
      });
    } else {
      res.status(404).json({ message: "No files found in the bucket!" });
    }
  } catch (error: any) {
    console.error("Error listing files:", error);
    res.status(500).json({
      error: "Failed to list files!",
      errorDetails: error.message,
    });
  }
});

router.get(
  "/permission/:s3_bucket_name",
  async (req: Request, res: Response) => {
    const { s3_bucket_name } = req.params;
    console.log("Getting bucket ACL for:", s3_bucket_name);

    const input: any = {
      Bucket: s3_bucket_name,
    };

    try {
      const command = new GetBucketAclCommand(input);
      const response = await client.send(command);

      res.status(200).json({
        message: `Bucket '${s3_bucket_name}' ACL listed successfully!`,
        response: response,
      });
    } catch (err) {
      res.status(500).json({
        error: "Failed to get bucket ACL",
        errorDetails: err,
      });
    }
  }
);

export default router;
