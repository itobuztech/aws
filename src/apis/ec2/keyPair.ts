import express, { Request, Response } from "express";
import {
  EC2Client,
  CreateKeyPairCommand,
  DescribeKeyPairsCommand,
  DeleteKeyPairCommand,
} from "@aws-sdk/client-ec2";

const router = express.Router();

const client = new EC2Client({
  region: process.env.AWS_REGION,
});

router.post("/create", async (req: Request, res: Response) => {
  const { KeyName, KeyType, ResourceType, Key, Value, KeyFormat, ImageId } =
    req.body;
  const input: any = {
    // CreateKeyPairRequest
    KeyName, // required
    KeyType,
    TagSpecifications: [
      // TagSpecificationList
      {
        // TagSpecification
        ResourceType,
        Tags: [
          // TagList
          {
            // Tag
            Key,
            Value,
          },
        ],
      },
    ],
    KeyFormat,
  };

  try {
    console.log("Creating Key Pair with input:", input);

    const command = new CreateKeyPairCommand(input);
    const response = await client.send(command);
    console.log("Key Pair Created:", response);
    res.status(200).json({
      message: `KeyPair created successfully`,
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
