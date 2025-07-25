import express, { Request, Response } from "express";
import {
  EC2Client,
  CreateSecurityGroupCommand,
  DescribeSecurityGroupsCommand,
  DeleteSecurityGroupCommand,
} from "@aws-sdk/client-ec2";

const router = express.Router();

const client = new EC2Client({
  region: process.env.AWS_REGION,
});

router.post("/create", async (req: Request, res: Response) => {
  const { Description, GroupName, VpcId, ResourceType, Key, Value } = req.body;

  try {
    const input: any = {
      // CreateSecurityGroupRequest
      Description, // required
      GroupName, // required
      VpcId,
      TagSpecifications: [
        {
          ResourceType, // required
          Tags: [
            {
              Key,
              Value,
            },
          ],
        },
      ],
      //   DryRun: true,
    };

    const command = new CreateSecurityGroupCommand(input);
    const response = await client.send(command);

    res
      .status(200)
      .json({ message: "Security group created successfully", response });
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to create security group:",
      errorDetrails: error,
    });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const { MaxResults, NextToken } = req.body;
  try {
    const input = {
      MaxResults,
      NextToken,
    };

    const command = new DescribeSecurityGroupsCommand(input);
    const response: any = await client.send(command);

    const securityGroups = response.SecurityGroups.map((sg: any) => {
      return {
        GroupId: sg.GroupId,
        GroupName: sg.GroupName,
        Description: sg.Description,
        OwnerId: sg.OwnerId,
        VpcId: sg.VpcId,
      };
    });

    res.status(200).json({
      message: "List of EC2 SecurityGroups :-",
      securityGroups: securityGroups,
      nextToken: response.NextToken || null,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to list security groups!", errorDetails: error });
  }
});

router.get("/:securityGroupID", async (req: Request, res: Response) => {
  try {
    const input: any = {
      GroupIds: [req.params.securityGroupID],
    };

    const command = new DescribeSecurityGroupsCommand(input);
    const response: any = await client.send(command);

    const securityGroups = response.SecurityGroups.map((sg: any) => {
      return {
        GroupId: sg.GroupId,
        GroupName: sg.GroupName,
        Description: sg.Description,
        OwnerId: sg.OwnerId,
        VpcId: sg.VpcId,
      };
    });

    res.status(200).json({
      message: `SecurityGroups '${securityGroups[0].GroupId}' details :-`,
      securityGroups: securityGroups,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to list security groups!", errorDetails: error });
  }
});

router.delete("/:securityGroupID", async (req: Request, res: Response) => {
  try {
    const input: any = {
      GroupId: req.params.securityGroupID,
    };

    const command = new DeleteSecurityGroupCommand(input);
    const response = await client.send(command);

    res.status(200).json({
      message: `SecurityGroups '${req.params.securityGroupID}' deleted successfully!`,
      response,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to list security groups!", errorDetails: error });
  }
});

export default router;
