import express, { Request, Response } from "express";
import axios from "axios";

const router = express.Router();

// AWS EC2 Metadata URL
const METADATA_BASE = "http://169.254.169.254/latest";

async function getIAMRole() {
  console.log("inside getIAMRole function");

  try {
    // Step 1: Get metadata token (IMDSv2)
    const tokenRes = await axios.put(`${METADATA_BASE}/api/token`, null, {
      headers: {
        "X-aws-ec2-metadata-token-ttl-seconds": "21600",
      },
    });

    console.log("Token received:", tokenRes.data);

    const token = tokenRes.data;

    // Step 2: Get IAM Role Name
    const roleNameRes = await axios.get(
      `${METADATA_BASE}/meta-data/iam/security-credentials/`,
      {
        headers: {
          "X-aws-ec2-metadata-token": token,
        },
      }
    );

    const roleName = roleNameRes.data;

    // Step 3: Get IAM Role Info (optional)
    const roleInfoRes = await axios.get(`${METADATA_BASE}/meta-data/iam/info`, {
      headers: {
        "X-aws-ec2-metadata-token": token,
      },
    });

    return {
      roleName,
      instanceProfileArn: roleInfoRes.data.InstanceProfileArn,
    };
  } catch (err: any) {
    return { error: "Unable to retrieve IAM role info", detail: err.message };
  }
}

router.get("/iam-role", async (req, res) => {
  console.log("Fetching IAM role information...");

  const iamInfo = await getIAMRole();
  res.status(200).json(iamInfo);
});

export default router;
