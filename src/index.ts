import { config } from "dotenv";
import express from "express";
import listServers from "./apis/ec2/servers";
import keyPair from "./apis/ec2/keyPair";
import getIAMRole from "./apis/ec2/getIAMRole";
import securityGroups from "./apis/ec2/securityGroup";
import volumes from "./apis/ec2/volumes";

const app = express();

app.use(express.json());

config();

async function startNodeExpressServer() {
  const app = express();

  app.use(express.json());

  app.use("/servers", listServers);
  app.use("/keyPair", keyPair);
  app.use("/getIAMRole", getIAMRole);
  app.use("/securityGroups", securityGroups);
  app.use("/volumes", volumes);

  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Listening to PORT : ${PORT}`);
  });
}

startNodeExpressServer();
