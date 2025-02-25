import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

let nodes: Node[] = [];

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  // Implement the status route
  _registry.get("/status", (req, res) => {
    res.send("live");
  });

  // Implement the register node route
  _registry.post("/registerNode", (req, res) => {
    const { nodeId, pubKey } = req.body as RegisterNodeBody;
    nodes.push({ nodeId, pubKey });
    res.send("success");
  });

  // Implement the get node registry route
  _registry.get("/getNodeRegistry", (req, res) => {
    res.json({ nodes });
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}
