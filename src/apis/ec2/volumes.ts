import express, { Request, Response } from "express";
import {
  EC2Client,
  DescribeVolumesCommand,
  CreateVolumeCommand,
  DeleteVolumeCommand,
} from "@aws-sdk/client-ec2";

const router = express.Router();

const client = new EC2Client({
  region: process.env.AWS_REGION,
});

router.post("/", async (req: Request, res: Response) => {
  const { MaxResults, NextToken } = req.body;

  try {
    const input = {
      MaxResults,
      NextToken,
    };

    const command = new DescribeVolumesCommand(input);
    const response = await client.send(command);

    const volumes = response.Volumes?.map((volume) => {
      return {
        VolumeId: volume.VolumeId,
        Size: volume.Size,
        AvailabilityZone: volume.AvailabilityZone,
        VolumeType: volume.VolumeType,
        State: volume.State,
        Attachments: volume.Attachments,
        Tags: volume.Tags,
      };
    });

    res.status(200).json({
      message: "List of EC2 volumes",
      volumes: volumes,
      nextToken: response.NextToken || null,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to describe volumes",
      errorDetails: error,
    });
  }
});

router.get("/:volumeId", async (req: Request, res: Response) => {
  try {
    const input = {
      VolumeIds: [req.params.volumeId],
    };

    const command = new DescribeVolumesCommand(input);
    const response = await client.send(command);

    const volumes = response.Volumes?.map((volume) => {
      return {
        VolumeId: volume.VolumeId,
        Size: volume.Size,
        AvailabilityZone: volume.AvailabilityZone,
        VolumeType: volume.VolumeType,
        State: volume.State,
        Attachments: volume.Attachments,
        Tags: volume.Tags,
      };
    });

    res.status(200).json({
      message: "List of EC2 volumes",
      volumes: volumes,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to describe volumes",
      errorDetails: error,
    });
  }
});

router.post("/create", async (req: Request, res: Response) => {
  const { AvailabilityZone, Size, VolumeType, ResourceType, Key, Value } =
    req.body;

  try {
    const input = {
      AvailabilityZone: AvailabilityZone || process.env.AWS_REGION,
      Size,
      VolumeType,
      TagSpecifications: [
        {
          ResourceType,
          Tags: [
            {
              Key,
              Value,
            },
          ],
        },
      ],
    };

    const command = new CreateVolumeCommand(input);
    const response = await client.send(command);

    res.status(200).json({
      message: "Volume created successfully",
      volume: response,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to create volume",
      errorDetails: error,
    });
  }
});

router.delete("/:volumeId", async (req: Request, res: Response) => {
  try {
    const input = {
      VolumeId: req.params.volumeId,
    };

    const command = new DeleteVolumeCommand(input);
    const response = await client.send(command);

    res.status(200).json({
      message: `Volume '${req.params.volumeId}' deleted successfully!`,
      volume: response,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete volume",
      errorDetails: error,
    });
  }
});

export default router;
