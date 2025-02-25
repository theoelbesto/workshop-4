import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT, BASE_ONION_ROUTER_PORT } from "../config";
import {rsaEncrypt} from "../crypto";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

let lastReceivedMessage: { [key: number]: string | null } = {};
let lastSentMessage: { [key: number]: string | null } = {};
let lastCircuit: { [key: number]: number[] | null } = {};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  // Initialize the last received and sent messages for this user
  lastReceivedMessage[userId] = null;
  lastSentMessage[userId] = null;
  lastCircuit[userId] = null;

  // Implement the status route
  _user.get("/status", (req, res) => {
    res.send("live");
  });

  // Implement the GET routes
  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage[userId] });
  });

  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage[userId] });
  });

  _user.get("/getLastCircuit", (req, res) => {
    res.json({ result: lastCircuit[userId] });
  });

  _user.post("/message", (req, res) => {
    const { message } = req.body;
    lastReceivedMessage[userId] = message;
    res.send("success");
  });

  _user.post("/sendMessage", async (req, res) => {
    const { message, destinationUserId } = req.body as SendMessageBody;
    lastSentMessage[userId] = message;

    // Generate a random circuit of 3 unique nodes
    const circuit = Array.from({ length: 10 }, (_, i) => i)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    lastCircuit[userId] = circuit;

    // Encrypt the message and send it through the circuit
    let encryptedMessage = btoa(message);
    for (const nodeId of circuit.reverse()) {
      const pubKey = await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + nodeId}/getPublicKey`)
        .then((res) => res.json())
        .then((json: any) => json.result as string);
      encryptedMessage = await rsaEncrypt(encryptedMessage, pubKey);
    }

    await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + circuit[0]}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: encryptedMessage, destination: destinationUserId }),
    });

    res.send("success");
  });

  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}