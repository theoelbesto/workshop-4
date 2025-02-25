import { webcrypto } from "crypto";
import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT, BASE_USER_PORT } from "../config";
import { rsaDecrypt, generateRsaKeyPair, exportPrvKey, exportPubKey } from "../crypto";

let lastReceivedEncryptedMessage: string | null = null;
let lastReceivedDecryptedMessage: string | null = null;
let lastMessageDestination: number | null = null;
let privateKey: webcrypto.CryptoKey | null = null;
let publicKey: string | null = null;

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  // Generate and store the private key for this node
  const { privateKey: _privateKey, publicKey: _publicKey } = await generateRsaKeyPair();
  privateKey = _privateKey;
  publicKey = await exportPubKey(_publicKey);

  // Register the node with the registry
  await fetch(`http://localhost:${REGISTRY_PORT}/registerNode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ nodeId, pubKey: publicKey }),
  });

  // Implement the status route
  onionRouter.get("/status", (req, res) => {
    res.send("live");
  });

  // Implement the GET routes
  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });

  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });

  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestination });
  });

  onionRouter.get("/getPrivateKey", async (req, res) => {
    const strPrvKey = await exportPrvKey(privateKey);
    res.json({ result: strPrvKey });
  });

  onionRouter.get("/getPublicKey", (req, res) => {
    res.json({ result: publicKey });
  });

  onionRouter.post("/message", async (req, res) => {
    const { message, destination } = req.body;
    lastReceivedEncryptedMessage = message;
    try {
      if (privateKey) {
        const decryptedMessage = await rsaDecrypt(message, privateKey);
        lastReceivedDecryptedMessage = decryptedMessage;
        lastMessageDestination = destination;

        // Forward the message to the next destination
        if (destination < BASE_USER_PORT) {
          await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + destination}/message`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: decryptedMessage, destination }),
          });
        } else {
          await fetch(`http://localhost:${destination}/message`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: decryptedMessage }),
          });
        }
      } else {
        throw new Error("Private key is not initialized");
      }
    } catch (error) {
      lastReceivedDecryptedMessage = null;
      lastMessageDestination = null;
    }
    res.send("success");
  });

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on port ${
        BASE_ONION_ROUTER_PORT + nodeId
      }`
    );
  });

  return server;
}
