import express, { Request, Response } from "express";
import {
  EC2Client,
  CreateKeyPairCommand,
  DescribeKeyPairsCommand,
  DeleteKeyPairCommand,
} from "@aws-sdk/client-ec2";
import path from "path";
import fs from "fs";

const router = express.Router();

const client = new EC2Client({
  region: process.env.AWS_REGION,
});

router.post("/create", async (req: Request, res: Response) => {
  const { KeyName, Key, Value, KeyFormat } = req.body;
  try {
    fs.mkdirSync("downloads/key-pairs", { recursive: true, mode: 0o444 });
  } catch (err: any) {
    res.status(200).json({
      message: `Error creating directory!`,
      errorDetails: err,
    });
  }
  const SAVE_PATH = path.join("downloads/key-pairs", `${KeyName}.pem`); // Save location
  const input: any = {
    KeyName, // required
    KeyType: "rsa",
    TagSpecifications: [
      {
        ResourceType: "key-pair",
        Tags: [
          {
            Key,
            Value,
          },
        ],
      },
    ],
    KeyFormat,
  };

  try {
    const command = new CreateKeyPairCommand(input);
    const response: any = await client.send(command);
    console.log("Key Pair response:", response);

    fs.writeFileSync(SAVE_PATH, response.KeyMaterial, {
      encoding: "utf8",
      mode: 0o444, // read-only for user (Linux/macOS)
    });

    res.status(200).json({
      message: `KeyPair '${response.keyPairId}' created successfully`,
      response: response,
    });
  } catch (error: any) {
    console.error("Error creating key pair:", error);
    res.status(500).json({
      error: "Failed to create key pair",
      ErrorDetails: error.message,
    });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const command = new DescribeKeyPairsCommand({});
    const response = await client.send(command);
    console.log("Key Pairs listed:", response);
    res.status(200).json({
      message: "Key pairs listed successfully",
      keyPairs: response.KeyPairs,
    });
  } catch (error: any) {
    console.error("Error listing key pairs:", error);
    res
      .status(500)
      .json({ error: "Failed to list key pairs", ErrorDetails: error });
  }
});

router.get("/:keyPairId", async (req: Request, res: Response) => {
  try {
    const input = {
      KeyPairIds: [req.params.keyPairId],
      IncludePublicKey: true,
      DryRun: false,
    };
    const command = new DescribeKeyPairsCommand(input);
    const response = await client.send(command);
    console.log("Key Pair details:", response);
    res.status(200).json({
      message: "Key Pair details:",
      keyPairs: response.KeyPairs,
    });
  } catch (error: any) {
    console.error("Error fetching key pair details:", error);
    res
      .status(500)
      .json({ error: "Error fetching key pair details:", ErrorDetails: error });
  }
});

router.delete("/:keyPairId", async (req: Request, res: Response) => {
  try {
    const input: any = {
      KeyPairId: req.params.keyPairId,
    };
    const command = new DeleteKeyPairCommand(input);
    const response = await client.send(command);
    console.log("Key Pair deleted:", response);
    res.status(200).json({
      message: `Key Pair ${req.params.keyPairId} deleted successfully`,
      response: response,
    });
  } catch (error: any) {
    console.error("Error deleting key pair:", error);
    res
      .status(500)
      .json({ error: "Failed to delete key pair", ErrorDetails: error });
  }
});

export default router;
