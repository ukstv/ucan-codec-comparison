# Comparison of dag-ucan and CACAO IPLD serialization formats

Before running, install the dependencies:

```
pnpm install
```

and start go-ipfs node with default parameters.

Repository has three important files:
- `comparison-1.js` - compares IPLD serialization of UCAN using vanilla `@ipld/dag-ucan` and CACAO formats;
  - Note: it also posts `cacao2` variant, which uses same byte encoding of `did:key` as `@ipld/dag-ucan`
- `comparison-2.js` - same, but `@ipld/dag-ucan` uses string representation of DID for `audience` and `issuer` fields.
- `comparison-3.js` - uses shortened `@ipld/dag-ucan` fields.

# Size Comparison

Below is a size comparison between [dag-ucan](https://github.com/ipld/js-dag-ucan) IPLD serialization format and [UCAN-CACAO](https://hackmd.io/@ukstv/Hy9bQB-Hc) one.

## Context

We would like to store UCAN on IPLD. As a side-effect that would provide uniform CID algorithm to reference UCAN in a capability chain.

Here we are looking at two approaches for IPLD serialization of UCAN. The first is [dag-ucan](https://github.com/ipld/js-dag-ucan). It uses the following IPLD schema (shortened for brevity):

```
type UCAN struct {
  version String

  issuer Bytes
  audience Bytes
  signature Bytes

  capabilities [Capability]
  proofs [&UCAN]
  expiration Int

  facts [Fact]
  nonce optional String
  notBefore optional Int
} representation map {
  field facts default []
  field proofs default []
}


type Capability struct {
  with String
  can String
}

type Fact { String: Any }
```

Proposed UCAN-CACAO serialization uses the following schema:
```
type CACAO struct {
  h Header
  p Payload // payload
  s Signature // signature, single
}

type Header struct {
  t String
}

type Signature struct {
  t String // "JWT"
  m optional SignatureMeta
  s Bytes
}

type SignatureMeta struct {
  alg String // = jwt alg field
}

type Payload {
    iss String
    aud String
    nbf optional Int
    exp Int
    nnc optional String
    fct [Fact] 
    prf [&CACAO]
    att [Attenuation]
} representation map {
    fields fct default []
}

type Fact { String: Any }
type Attenuation {
    with String
    can String
}
```

## Comparison Methodology

To compare IPLD block size we use the same original UCAN:

JWT form:

```
eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCIsInVjdiI6IjAuOC4xIn0.eyJhdHQiOlt7ImNhbiI6InN0b3JlL3B1dCIsIndpdGgiOiJkaWQ6a2V5Ono2TWtrODliQzNKclZxS2llNzFZRWNjNU0xU01WeHVDZ054NnpMWjhTWUpzeEFMaSJ9XSwiYXVkIjoiZGlkOmtleTp6Nk1razg5YkMzSnJWcUtpZTcxWUVjYzVNMVNNVnh1Q2dOeDZ6TFo4U1lKc3hBTGkiLCJleHAiOjE2NTI0NDk3MjksImlzcyI6ImRpZDprZXk6ejZNa2s4OWJDM0pyVnFLaWU3MVlFY2M1TTFTTVZ4dUNnTng2ekxaOFNZSnN4QUxpIiwicHJmIjpbXX0.nAVI5RjxBMjEyHgwiXztyzge2Jx7tgv2XGNT9L88qvneCsut2tppabdK-dKlWijzHvwSO_7kZ4Pb4LqBdEd1CA

```

Decoded:
```json=
{
    "payload": {
        {
          "att": [
            {
              "can": "store/put",
              "with": "did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi"
            }
          ],
          "aud": "did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi",
          "exp": 1652449729,
          "iss": "did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi",
          "prf": []
        }
    },
    "signatures": [
        {
            "protected": {"ucv":"0.8.1","alg":"EdDSA","typ":"JWT"},
            "signature": "nAVI5RjxBMjEyHgwiXztyzge2Jx7tgv2XGNT9L88qvneCsut2tppabdK-dKlWijzHvwSO_7kZ4Pb4LqBdEd1CA"
        }
    ]
}
```

Corresponding cacao:
```
{
  "h": {
    "t": "ucv@0.8.1"
  },
  "p": {
    "att": [
      {
        "can": "store/put",
        "with": "did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi"
      }
    ],
    "aud": "did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi",
    "exp": 1652449729,
    "iss": "did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi",
  },
  "s": {
    "t": "JWT",
    "m": {
      "alg": "EdDSA"
    },
    "s": "nAVI5RjxBMjEyHgwiXztyzge2Jx7tgv2XGNT9L88qvneCsut2tppabdK-dKlWijzHvwSO_7kZ4Pb4LqBdEd1CA" // bytes encoded as base64url
  }
}

```

**1. Vanilla @ipld/dag-ucan encoding**

See `comparison-1.js`

Using vanilla `@ipld/dag-ucan` package we have this IPLD block, encoded as base16:
```
a7666973737565725822ed015440c98c4bbaaae14853cca9f75fd363ff8c60af06be52a84c39ea382a2f09536670726f6f6673806776657273696f6e65302e382e316861756469656e63655822ed015440c98c4bbaaae14853cca9f75fd363ff8c60af06be52a84c39ea382a2f0953697369676e617475726558409c0548e518f104c8c4c87830897cedcb381ed89c7bb60bf65c6353f4bf3caaf9de0acbaddada6969b74af9d2a55a28f31efc123bfee46783dbe0ba81744775086a65787069726174696f6e1a627e61c16c6361706162696c697469657381a26363616e6973746f72652f707574647769746878386469643a6b65793a7a364d6b6b38396243334a7256714b6965373159456363354d31534d56787543674e78367a4c5a3853594a7378414c69
```
Its length is 295 bytes.

Corresponding cacao block is 325 bytes.

Apart the format, the single major difference is DID representation. `@ipld/dag-ucan` represents `aud` and `iss` fields as public keys of corresponding `did:key` DIDs. CACAO though represents them as vanilla strings. We could change CACAO representation to use same binary public keys. This way we could reduce number of bytes to 281.

**2. @ipld/dag-ucan encoding with DID as string**

See `comparison-2.js`

Based on [discussion](https://github.com/ipld/js-dag-ucan/issues/24), DIDs for `aud` and `iss` should better be represented as strings. Here we modify dag-ucan encoding to use DID strings. This leads to increase in size to 339 bytes.

## Shaving the bytes

Let's see how we could reduce block size. First, for UCAN. UCAN ADL uses long field names: `expiration` instead of JWT `exp`, `audience` instead of `aud`, and so on. We could shorten these. Let's use single-letter fields for ancillary fields, like `version` and `signature`. Let JWT payload fields use three letters, as per original UCAN spec. Resulting payload is below:
```json=
{
  {
  "s": "9C0548E518F104C8C4C87830897CEDCB381ED89C7BB60BF65C6353F4BF3CAAF9DE0ACBADDADA6969B74AF9D2A55A28F31EFC123BFEE46783DBE0BA8174477508",
  "v": "0.8.1",
  "att": [
    {
      "can": "store/put",
      "with": "did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi"
    }
  ],
  "aud": "did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi",
  "exp": 1652449729,
  "iss": "did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi",
  "prf": []
}
```

This requires 298 bytes when encoded in CBOR.

We could do shaving for CACAO as well. It already uses compact field names. We know, that UCAN is generally limited to JWT-supported algorithms and `did:key`. We could deduce JWT `alg` field based on `did:key` the same way vanilla `@ipld/dag-cbor` does. We remove then signature metadata then. This results in the following CACAO payload:
```json=
{
  "h": {
    "t": "ucv@0.8.1"
  },
  "p": {
    "att": [
      {
        "can": "store/put",
        "with": "did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi"
      }
    ],
    "aud": "did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi",
    "exp": 1652449729,
    "iss": "did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi",
    "prf": []
  },
  "s": {
    "s": "9C0548E518F104C8C4C87830897CEDCB381ED89C7BB60BF65C6353F4BF3CAAF9DE0ACBADDADA6969B74AF9D2A55A28F31EFC123BFEE46783DBE0BA8174477508",
    "t": "JWT"
  }
}
```
This requires 317 bytes.

The difference in 19 bytes is because of CBOR encoding of nested fields and "ucv" string. It is pretty much constant.

## Conclusion

Semantically dag-ucan and UCAN-CACAO encoding are the same.
There is a small constant difference in size. Using the present code and specifications, for the same UCAN, we have 325 bytes for CACAO and 295 bytes for UCAN. If we modify dag-ucan to use `did:key` strings, we get 339 bytes for UCAN. After modification of the format to further reduce number of bytes, we get 317 bytes for CACAO and 298 bytes for UCAN, with the constant difference between the formats.

Overall, CACAO and dag-ucan are comparable in size, with constant difference due to richer format of CACAO metadata. In the world where JWT is the only option, it makes sense to go with dag-ucan. If we have interoperability in mind though, it makes sense to stick with CACAO.


