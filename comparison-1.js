// Uses vanilla @ipld/dag-ucan with byte representation of issuer and audience DIDs

import * as UCAN from "@ipld/dag-ucan";
import * as ucans from "ucans";
import * as httpClient from "ipfs-http-client";
import * as uint8arrays from "uint8arrays";
import _ from 'lodash'

const client = await httpClient.create({ url: "http://localhost:5001" });

// Copy of https://github.com/ipld/js-dag-ucan/blob/main/test/util.js#L70
function createEdIssuer(secret) {
  return ucans.EdKeypair.fromSecretKey(secret);
}

function extractJSON(part) {
  const asBytes = uint8arrays.fromString(part, "base64url");
  const asString = uint8arrays.toString(asBytes);
  return JSON.parse(asString);
}

// Convert UCAN JWT to CACAO as per https://hackmd.io/mKnU9UK4Sgi2kMRkhAMoYA
function convertToCacao(jwt) {
  const [headerString, payloadString, signatureString] = jwt.split(".");
  const header = extractJSON(headerString);
  const payload = extractJSON(payloadString);
  const signature = uint8arrays.fromString(signatureString, "base64url");
  const signatureMeta = Object.assign({}, header);
  delete signatureMeta.ucv;
  delete signatureMeta.typ;
  if (payload.prf && payload.prf.length == 0) {
    delete payload.prf
  }
  return {
    h: {
      t: `ucv@${header.ucv}`,
    },
    p: payload,
    s: {
      t: header.typ,
      m: signatureMeta,
      s: signature,
    },
  };
}

function cacaoJSON(cacao) {
  const result = _.cloneDeep(cacao)
  result.s.s = uint8arrays.toString(cacao.s.s, 'base64url')
  return result
}

/** did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi */
export const alice = createEdIssuer(
  "U+bzp2GaFQHso587iSFWPSeCzbSfn/CbNHEz7ilKRZ1UQMmMS7qq4UhTzKn3X9Nj/4xgrwa+UqhMOeo4Ki8JUw=="
);

const ucan = await UCAN.issue({
  issuer: alice,
  audience: alice,
  expiration: 1652449729,
  capabilities: [
    {
      with: alice.did(),
      can: "store/put",
    },
  ],
});

// Make it a valid JWT
// Mitigates https://github.com/ipld/js-dag-ucan/issues/35
const ucanJWT = UCAN.format(ucan).replace(/=/g, "");
const ucanBlock = UCAN.encode(ucan);

const cacao = convertToCacao(ucanJWT);
const cacaoBlockCid = await client.dag.put(cacao);
const cacaoBlock = await client.block.get(cacaoBlockCid);

// CACAO encodes dids as strings, while ucan contains bytes for did keys.
console.log("cacao.size", cacaoBlock.length);
console.log("ucan.size", ucanBlock.length);

// Let's make it even by using bytes in CACAO
const issuerBytes = ucan.model.issuer;
const audienceBytes = ucan.model.audience;
cacao.p.aud = audienceBytes;
cacao.p.iss = issuerBytes;
const cacao2BlockCid = await client.dag.put(cacao);
const cacao2Block = await client.block.get(cacao2BlockCid);
console.log("cacao2Block.size", cacao2Block.length);
// ucan is 295 bytes, cacao2 is 286 bytes