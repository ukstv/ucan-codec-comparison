// Uses custom @ipld/dag-ucan with string representation of issuer and audience DIDs
// This custom code is in +adl-did-strings+ folder.
// The only difference from vanilla @ipld/dag-ucan is CBOR codec, that encodes issuer and audience as strings

import * as UCAN from "./adl-did-strings/adl-did-strings.util.js";
import * as ucans from "ucans";
import * as httpClient from "ipfs-http-client";
import * as uint8arrays from "uint8arrays";
import * as CBOR from "@ipld/dag-cbor"
import * as Parser from "./adl-did-strings/parser.js";

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
  return {
    h: {
      t: `ucv@${header.ucv}`,
    },
    p: payload,
    s: {
      t: header.typ,
      s: signature,
    },
  };
}

/** did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi */
export const alice = createEdIssuer(
  "U+bzp2GaFQHso587iSFWPSeCzbSfn/CbNHEz7ilKRZ1UQMmMS7qq4UhTzKn3X9Nj/4xgrwa+UqhMOeo4Ki8JUw=="
);

// Instead of UCAN.issue
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

function ucanEncode(ucan) {

  const parseProof = (cid, context) =>
      /** @type {UCAN.Proof<C>} */ (CID.asCID(cid)) ||
      Parser.ParseError.throw(
          `Expected ${context} to be CID, instead got ${JSON.stringify(cid)}`
      )

  const match = {
    v: Parser.parseVersion(ucan.version, "version"),
    iss: ucan.issuer.did(), // CHANGED
    aud: ucan.audience.did(), // CHANGED
    att: /** @type {C[]} */ (
        Parser.parseCapabilities(ucan.capabilities, "capabilities")
    ),
    exp: Parser.parseInt(ucan.expiration, "expiration"),
    prf: Parser.parseOptionalArray(ucan.proofs, parseProof, "proofs") || [],
    s: Parser.parseBytes(ucan.signature, "signature"),
    nnc: Parser.parseOptionalString(ucan.nonce, "nonce"),
    fct: Parser.parseOptionalArray(ucan.facts, Parser.parseFact, "facts") || [],
    nbf: Parser.parseOptionalInt(ucan.notBefore, "notBefore"),
  }

  const { fct, nnc, nbf, ...rest } = match
  let toEncode = {
    ...rest,
    // leave out optionals unless they are set
    ...(fct.length > 0 && { facts: fct }),
    ...(ucan.nonce && { nonce: nnc }),
    ...(ucan.notBefore && { notBefore: ucan.notBefore }),
    s: Parser.parseBytes(ucan.signature, "signature"),
  }
  return CBOR.encode(toEncode)
}

// Make it a valid JWT
// Mitigates https://github.com/ipld/js-dag-ucan/issues/35
const ucanJWT = UCAN.format(ucan).replace(/=/g, "");
const ucanBlock = ucanEncode(ucan);

const cacao = convertToCacao(ucanJWT);
const cacaoBlockCid = await client.dag.put(cacao);
const cacaoBlock = await client.block.get(cacaoBlockCid);

// CACAO encodes dids as strings, while ucan contains bytes for did keys.
console.log("cacao.size", cacaoBlock.length);
console.log("ucan.size", ucanBlock.length);