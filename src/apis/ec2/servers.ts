import express, { Request, Response } from "express";
import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeInstanceAttributeCommand,
  StartInstancesCommand,
  StopInstancesCommand,
  RunInstancesCommand,
  TerminateInstancesCommand,
  ModifyInstanceAttributeCommand,
} from "@aws-sdk/client-ec2";

const router = express.Router();

const client = new EC2Client({
  region: process.env.AWS_REGION,
});

router.get("/:max", async (req: Request, res: Response) => {
  try {
    let nextToken = undefined;
    let page = 1;
    const pageSize: number = parseInt(req.params.max);
    let index = 0;
    do {
      console.log(`Fetching page ${page}...`);

      const command = new DescribeInstancesCommand({
        MaxResults: pageSize,
        NextToken: nextToken,
      });

      const response: any = await client.send(command);

      const reservations = response.Reservations || [];
      for (const reservation of reservations) {
        for (const instance of reservation.Instances || []) {
          console.log({
            slNo: index + 1,
            InstanceId: instance.InstanceId,
            KeyName: instance.KeyName,
            State: instance.State?.Name,
            Type: instance.InstanceType,
            PublicIp: instance.PublicIpAddress,
            LaunchTime: instance.LaunchTime,
          });
          index++;
        }
      }

      nextToken = response.NextToken;
      // console.log(`NextToken: ${nextToken}`);
      page++;
    } while (nextToken);
  } catch (err) {
    console.error("Error listing instances:", err);
  }
});

router.post("/", async (req: Request, res: Response) => {
  const { maxResults, nextToken } = req.body;

  try {
    const input = {
      MaxResults: maxResults,
      NextToken: nextToken,
    };

    const command = new DescribeInstancesCommand(input);
    const response = await client.send(command);

    const instances: any = [];
    response.Reservations?.forEach((reservation, index) => {
      //   console.log("reservation:", JSON.stringify(reservation, null, 2));

      reservation.Instances?.forEach((instance, instanceIndex) => {
        instances.push({
          slNo: index + 1,
          InstanceId: instance.InstanceId,
          KeyName: instance.KeyName,
          ImageId: instance.ImageId,
          State: instance.State?.Name,
          Type: instance.InstanceType,
          PublicIp: instance.PublicIpAddress,
          LaunchTime: instance.LaunchTime,
        });
      });
    });

    console.log("EC2 Instances:");
    console.table(instances);

    res.status(200).json({
      message: "List of EC2 instances",
      response: instances,
      nextToken: response.NextToken || null,
    });
  } catch (err) {
    console.error("Error listing instances:", err);
  }
});

router.get(
  "/instanceSpecificProperty/:instanceId",
  async (req: Request, res: Response) => {
    const instanceId = req.params.instanceId;

    try {
      const command = new DescribeInstanceAttributeCommand({
        InstanceId: instanceId,
        Attribute: "instanceType",
      });

      const response = await client.send(command);
      console.log("Instance Details:", response);

      res.status(200).json({
        message: `Details for instance ${instanceId}`,
        response,
      });
    } catch (err) {
      console.error(`Error fetching details for instance ${instanceId}:`, err);
      res.status(500).json({ error: "Failed to fetch instance details" });
    }
  }
);

router.get("/details/:instanceId", async (req: Request, res: Response) => {
  try {
    const instanceId = req.params.instanceId;
    const command = new DescribeInstancesCommand({
      InstanceIds: [instanceId],
    });

    const result = await client.send(command);

    const reservations: any =
      result.Reservations?.map((res) => res.Instances) || [];

    const response = reservations[0];

    console.log("Instance Details:", response);

    const instanceData = [];

    if (response.length > 0) {
      const instance = response[0];
      instanceData.push({
        InstanceId: instance.InstanceId,
        KeyName: instance.KeyName,
        ImageId: instance.ImageId,
        State: instance.State?.Name,
        Type: instance.InstanceType,
        PublicIp: instance.PublicIpAddress,
        LaunchTime: instance.LaunchTime,
        cpuOptions: instance.CpuOptions,
        SecurityGroups: instance.SecurityGroups,
        Tags: instance.Tags,
        VpcId: instance.VpcId,
      });

      res.status(200).json({
        message: `Details for instance ${instanceId}`,
        response: response,
      });
    } else {
      console.log("No instance found with ID:", instanceId);
    }
  } catch (err) {
    console.error("Error listing instances:", err);
    res.status(500).json({ error: "Failed to list instances" });
  }
});

router.get("/stopInstance/:instanceId", async (req: Request, res: Response) => {
  try {
    const input = {
      InstanceIds: [req.params.instanceId],
    };

    const command = new StopInstancesCommand(input);
    const response = await client.send(command);
    console.log("Instance stopped:", response);
    res.status(200).json({
      message: `Instance ${req.params.instanceId} stopped successfully`,
      response: response.StoppingInstances,
    });
  } catch (error: any) {
    console.error(`Error stopping instance ${req.params.instanceId}:`, error);
    res
      .status(500)
      .json({ error: "Failed to stop instance:", ErrorDetails: error });
  }
});

router.get(
  "/startInstance/:instanceId",
  async (req: Request, res: Response) => {
    try {
      const input = {
        InstanceIds: [req.params.instanceId],
      };

      const command = new StartInstancesCommand(input);
      const response = await client.send(command);
      console.log("Instance stopped:", response);
      res.status(200).json({
        message: `Instance ${req.params.instanceId} started successfully`,
        response: response.StartingInstances,
      });
    } catch (error: any) {
      console.error(`Error starting instance ${req.params.instanceId}:`, error);
      res
        .status(500)
        .json({ error: "Failed to start instance:", ErrorDetails: error });
    }
  }
);

router.post("/create", async (req: Request, res: Response) => {
  const {
    DeviceName,
    VolumeSize,
    ImageId,
    InstanceType,
    MinCount,
    MaxCount,
    KeyName,
    SecurityGroupIds,
    ResourceType,
    Key,
    Value,
  } = req.body;
  try {
    const input: any = {
      BlockDeviceMappings: [
        {
          DeviceName,
          Ebs: {
            VolumeSize,
          },
        },
      ],
      ImageId,
      InstanceType,
      MinCount,
      MaxCount,
      KeyName,
      SecurityGroupIds: [SecurityGroupIds],
      TagSpecifications: [
        {
          ResourceType,
          Tags: [{ Key, Value }],
        },
      ],
    };

    const command = new RunInstancesCommand(input);
    const response: any = await client.send(command);
    console.log("Instance started:", response);

    res.status(200).json({
      message: `Instance '${response.Instances[0].InstanceId}' started successfully`,
      response: response.Instances,
    });
  } catch (error: any) {
    console.error(`Error starting instance ${req.params.instanceId}:`, error);
    res
      .status(500)
      .json({ error: "Failed to start instance:", ErrorDetails: error });
  }
});

router.delete(
  "/terminate/:instanceId/:dryRun",
  async (req: Request, res: Response) => {
    try {
      const input = {
        InstanceIds: [req.params.instanceId],
        DryRun: req.params.dryRun === "true" ? true : false,
      };

      const command = new TerminateInstancesCommand(input);
      const response = await client.send(command);
      console.log("Instance terminated:", response);
      res.status(200).json({
        message: `Instance ${req.params.instanceId} terminated successfully`,
        response: response.TerminatingInstances,
      });
    } catch (error: any) {
      console.error(
        `Error terminating instance ${req.params.instanceId}:`,
        error
      );
      res
        .status(500)
        .json({ error: "Failed to terminate instance:", ErrorDetails: error });
    }
  }
);

router.put("/modify/:instanceId", async (req: Request, res: Response) => {
  try {
    const input = {
      InstanceId: req.params.instanceId,
      InstanceType: {
        Value: req.body.InstanceType,
      },
    };

    console.log("Modifying instance with input:", input);

    const command = new ModifyInstanceAttributeCommand(input);
    const response = await client.send(command);
    console.log("Instance type updated:", response);
    res.status(200).json({
      message: `Instance for ${req.params.instanceId} updated to successfully`,
      response: response,
    });
  } catch (error: any) {
    console.error(
      `Error updating instance type for ${req.params.instanceId}:`,
      error
    );
    res.status(500).json({
      error: "Failed to update instance type:",
      ErrorDetails: error,
    });
  }
});
export default router;
