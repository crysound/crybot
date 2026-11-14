import { createHash } from "node:crypto";
import { Aes256Gcm, CipherSuite, DhkemP256HkdfSha256, HkdfSha256 } from "@hpke/core";
import { PHONE_SECRET_INFO, phoneSecretAAD, phoneSecretKeyIdFromJwk } from "../server/phone-secret.ts";

const suite = new CipherSuite({
  kem: new DhkemP256HkdfSha256(),
  kdf: new HkdfSha256(),
  aead: new Aes256Gcm(),
});
const privateKey = {
  kty: "EC",
  crv: "P-256",
  x: "g8FDXb91acXUNkuxNk7dWDQ0aN2zn6On2HeOGOvZOjs",
  y: "bJelczS0LM82rfXV68PmSJhz2ePosj3fL974XckCpDU",
  d: "5B-SwYLGXc04u4v7YLpzFrwj2JjysBFaJevOPl3h3Zg",
};
const keyId = phoneSecretKeyIdFromJwk(privateKey);
if (!keyId) throw new Error("Invalid vector key");
const context = {
  version: 1,
  keyId,
  deviceId: "paired-device-1",
  botId: "bot-1",
  threadId: "thread-1",
  messageId: "message-1",
  target: "ttsKey",
  requestKey: "credential-request-1",
};
const publicKey = await suite.kem.importKey("jwk", {
  kty: privateKey.kty, crv: privateKey.crv, x: privateKey.x, y: privateKey.y,
}, true);
// Fixed ephemeral material is for this public test vector only; real HPKE senders must use fresh randomness.
const ekm = createHash("sha256").update("crybot phone secret test vector ephemeral v1").digest();
const encrypted = await suite.seal({
  recipientPublicKey: publicKey,
  info: new TextEncoder().encode(PHONE_SECRET_INFO),
  ekm,
}, new TextEncoder().encode("swift-to-node-secret"), phoneSecretAAD(context));
console.log(JSON.stringify({
  privateKey,
  ...context,
  encapsulatedKey: Buffer.from(encrypted.enc).toString("base64url"),
  ciphertext: Buffer.from(encrypted.ct).toString("base64url"),
}, null, 2));
