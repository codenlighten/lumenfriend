const DEFAULT_EXPLORER_URL = "https://explorer.smartledger.technology";

function getExplorerUrl() {
  return process.env.BSV_EXPLORER_URL || DEFAULT_EXPLORER_URL;
}

export async function getTxInfo(txid) {
  const url = `${getExplorerUrl()}/api/bsv/main/tx/${txid}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch tx info: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error("Transaction not found or API error.");
  }

  return result.data;
}

export async function verifyAnchorOnChain(txid) {
  const txInfo = await getTxInfo(txid);
  
  if (!txInfo.vout || txInfo.vout.length === 0) {
    throw new Error("No outputs found in transaction.");
  }

  const opReturnOutput = txInfo.vout.find((output) => {
    return output.scriptPubKey && output.scriptPubKey.type === "nulldata";
  });

  if (!opReturnOutput) {
    throw new Error("No OP_RETURN output found in transaction.");
  }

  const anchorPayload = opReturnOutput.scriptPubKey.opReturn?.parts?.[0];

  return {
    txid,
    confirmed: txInfo.confirmations > 0,
    confirmations: txInfo.confirmations,
    blockHeight: txInfo.blockheight,
    blockTime: txInfo.blocktime,
    opReturnHex: opReturnOutput.scriptPubKey.hex,
    anchorPayload,
    tx: {
      size: txInfo.size,
      blockTime: txInfo.blocktime,
      confirmations: txInfo.confirmations
    }
  };
}
