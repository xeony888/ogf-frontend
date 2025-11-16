import { BlockhashWithExpiryBlockHeight, Connection, LAMPORTS_PER_SOL, PublicKey, TransactionExpiredBlockheightExceededError, VersionedTransaction, VersionedTransactionResponse } from "@solana/web3.js";
import BN from "bn.js";
import promiseRetry from "promise-retry";

export const ogfMint = process.env.NEXT_PUBLIC_OGF_MINT
export function calculateReward(bids: BN, id: BN, amount: BN): BN {
    id = id.add(new BN(1))
    if (bids.eq(id) && id.eq(new BN(1))) {
        return amount
    }
    if (bids.eq(id)) {
        return amount.div(new BN(2))
    } else {
        return amount.div(new BN(2)).div(bids.sub(new BN(1)))
    }
}
export function calculateBidCost(fee: BN, num: BN): number {
    return fee.mul(num.pow(new BN(2))).toNumber() / LAMPORTS_PER_SOL;
}
export function calculateNextReleaseAmountRaw(releases: BN, releaseAmount: BN): BN {
    return releaseAmount.mul(releases);
}
export function calculateNextReleaseAmount(releases: BN, releaseAmount: BN, decimals: number): BN {
    const realReleases = releases.eq(new BN(0)) ? 1 : releases.toNumber()
    return releaseAmount.muln(realReleases).divn(10 ** decimals);
    // return Number((releaseAmount.toNumber() * realReleases / (10 ** decimals)).toFixed(decimals));
}
export function displayTokenValue(value: BN | undefined, decimals: number | undefined): string {
    if (!value || decimals === undefined) return undefined;
    if (value.gtn(10 ** decimals)) {
        return value.divn(10 ** decimals).toString()
    } else {
        return (value.toNumber() / (10 ** decimals)).toString();
    }
}
export function displaySolValue(value: BN | undefined): string {
    if (!value) return undefined;
    return (value.toNumber() / LAMPORTS_PER_SOL).toString()
}
export async function jupQuote(from: string, to: string, amount: number) {
    try {
        const quote = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${from}&outputMint=${to}&amount=${amount}&slippageBps=50`)
        if (quote.ok) {
            return await quote.json()
        } else {
            return { outAmount: 0 }
        }
    } catch (e) {
        console.error(e)
        return { outAmount: 0 }
    }
}
const ogcMint = "DH5JRsRyu3RJnxXYBiZUJcwQ9Fkb562ebwUsufpZhy45"
export async function jupiterSwapTx(amount: number, publicKey: PublicKey) {
    const quoteResponse = await (
        await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${ogcMint}&outputMint=So11111111111111111111111111111111111111112&amount=${amount}&slippageBps=50`)
    ).json();
    const { swapTransaction } = await (
        await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // quoteResponse from /quote api
                quoteResponse,
                // user public key to be used for the swap
                userPublicKey: publicKey.toString(),
                // auto wrap and unwrap SOL. default is true
                wrapAndUnwrapSol: true,
                // Optional, use if you want to charge a fee.  feeBps must have been passed in /quote API.
                // feeAccount: "fee_account_public_key"
            })
        })
    ).json();
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    let transaction = VersionedTransaction.deserialize(swapTransactionBuf as any);
    return transaction;
}

type TransactionSenderAndConfirmationWaiterArgs = {
    connection: Connection;
    serializedTransaction: Buffer;
    blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight;
};

const SEND_OPTIONS = {
    skipPreflight: true,
};
function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export async function transactionSenderAndConfirmationWaiter({
    connection,
    serializedTransaction,
    blockhashWithExpiryBlockHeight,
}: TransactionSenderAndConfirmationWaiterArgs): Promise<VersionedTransactionResponse | null> {
    const txid = await connection.sendRawTransaction(
        serializedTransaction,
        SEND_OPTIONS
    );

    const controller = new AbortController();
    const abortSignal = controller.signal;

    const abortableResender = async () => {
        while (true) {
            await wait(2_000);
            if (abortSignal.aborted) return;
            try {
                await connection.sendRawTransaction(
                    serializedTransaction,
                    SEND_OPTIONS
                );
            } catch (e) {
                console.warn(`Failed to resend transaction: ${e}`);
            }
        }
    };

    try {
        abortableResender();
        const lastValidBlockHeight =
            blockhashWithExpiryBlockHeight.lastValidBlockHeight;

        // this would throw TransactionExpiredBlockheightExceededError
        await Promise.race([
            connection.confirmTransaction(
                {
                    ...blockhashWithExpiryBlockHeight,
                    lastValidBlockHeight,
                    signature: txid,
                    abortSignal,
                },
                "confirmed"
            ),
            new Promise(async (resolve) => {
                // in case ws socket died
                while (!abortSignal.aborted) {
                    await wait(2_000);
                    const tx = await connection.getSignatureStatus(txid, {
                        searchTransactionHistory: false,
                    });
                    if (tx?.value?.confirmationStatus === "confirmed") {
                        resolve(tx);
                    }
                }
            }),
        ]);
    } catch (e) {
        if (e instanceof TransactionExpiredBlockheightExceededError) {
            // we consume this error and getTransaction would return null
            return null;
        } else {
            // invalid state from web3.js
            throw e;
        }
    } finally {
        controller.abort();
    }

    // in case rpc is not synced yet, we add some retries
    const response = promiseRetry(
        async (retry: any) => {
            const response = await connection.getTransaction(txid, {
                commitment: "confirmed",
                maxSupportedTransactionVersion: 0,
            });
            if (!response) {
                retry(response);
            }
            return response;
        },
        {
            retries: 5,
            minTimeout: 1e3,
        }
    );

    return response;
}
