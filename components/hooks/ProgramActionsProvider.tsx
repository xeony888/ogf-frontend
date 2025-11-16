import { createContext, DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES, useContext } from "react";
import { useProgram } from "./ProgramProvider";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useTransactionSend } from "./TransactionSend";
import { BN } from "bn.js";
import { useProgramData } from "./ProgramData";
import { PublicKey, Transaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { calculateBidCost, jupiterSwapTx, jupQuote, ogfMint, transactionSenderAndConfirmationWaiter } from "../utils";
import { Wallet } from "@coral-xyz/anchor";
import bs58 from "bs58";

type ProgramActionsProps = {
    initialize: () => Promise<void>,
    modifyGlobalData: (fee: number, releaseLength: number, maxTimeBetweenBids: number, releaseAmount: number, claimExpiryTime: number) => Promise<void>
    bid: (usingOgc: boolean) => Promise<void>,
    claim: () => Promise<void>,
    deposit: (amount: number) => Promise<void>,
    withdraw: (amount: number) => Promise<void>,
}
const ProgramActionsContext = createContext<ProgramActionsProps>({} as ProgramActionsProps);
export default function ProgramActionsProvider({ children }: { children: React.ReactNode }) {
    const { publicKey } = useWallet();
    const { program, provider } = useProgram();
    const { sendTransaction } = useTransactionSend();
    const { connection } = useConnection()
    const { globalDataAccount, currentPoolAccount, userBidAccounts, mintData, setOnBid, setOnClaim } = useProgramData();
    const initialize = async () => {
        const transaction = await program.methods.initialize().accounts({
            signer: publicKey,
        }).transaction();
        const transaction2 = await program.methods.initialize2().accounts({
            mint: new PublicKey(ogfMint)
        }).transaction()
        try {
            await sendTransaction(transaction)
        } catch (e) {
            console.error(e);
            console.error("Error sending 1st initialize")
        }
        try {
            await sendTransaction(transaction2)
        } catch (e) {
            console.error(e);
            console.error("Error sending 2nd transaction")
        }
    }
    const modifyGlobalData = async (fee: number, releaseLength: number, maxTimeBetweenBids: number, releaseAmount: number, claimExpiryTime: number) => {
        const transaction = await program.methods.modifyGlobalData(new BN(fee), new BN(releaseLength), new BN(maxTimeBetweenBids), new BN(releaseAmount), new BN(claimExpiryTime)).accounts({
            signer: publicKey
        }).transaction();
        await sendTransaction(transaction);
    }
    const bid = async (usingOgc: boolean) => {
        const transaction = new Transaction();
        const time = new BN(Math.floor(Date.now() / 1000));
        let didRelease = false;
        let epoch = false;
        if (usingOgc) {
            const bidCost = calculateBidCost(globalDataAccount.fee, new BN(currentPoolAccount.bids))
            const transaction = await jupiterSwapTx(bidCost, publicKey);
            const latestBlockHash = await connection.getLatestBlockhash();
            console.log("here");
            // Execute the transaction
            const tx = await provider.wallet.signTransaction(transaction);
            const rawTransaction = tx.serialize();
            const result = await transactionSenderAndConfirmationWaiter({
                connection,
                serializedTransaction: rawTransaction as any,
                blockhashWithExpiryBlockHeight: latestBlockHash
            });
            console.log(result?.transaction?.signatures)
        }
        if (time.gt(currentPoolAccount.bidDeadline)) {
            epoch = true;
            didRelease = true;
            const [prevPoolAddress] = PublicKey.findProgramAddressSync(
                [Buffer.from("pool"), new BN(globalDataAccount.pools).toArrayLike(Buffer, "le", 2)],
                program.programId
            )
            const newPool = await program.methods.newPool(globalDataAccount.pools + 1).accounts({
                signer: publicKey,
                prevPool: prevPoolAddress
            }).transaction();
            const release = await program.methods.release(globalDataAccount.pools + 1).accounts({
                signer: publicKey
            }).transaction();
            const create = await program.methods.createBid(globalDataAccount.pools + 1, 0).accounts({
                signer: publicKey
            }).transaction()
            const bid = await program.methods.bid(globalDataAccount.pools + 1, 0).accounts({
                signer: publicKey
            }).transaction();
            transaction.add(newPool, release, create, bid);
        } else {
            // const userBidAccounts = await program.account.bidAccount.all([
            //     {
            //         memcmp: {
            //             offset: 8 + 2 + 2,
            //             bytes: publicKey.toBase58()
            //         }
            //     },
            //     {
            //         memcmp: {
            //             offset: 8,
            //             bytes: bs58.encode(new BN(globalDataAccount.pools).toArrayLike(Buffer, "le", 2))
            //         }
            //     }
            // ])
            // possibly create extra accounts here
            if (time.gt(currentPoolAccount.releaseTime)) {
                didRelease = true;
                const release = await program.methods.release(globalDataAccount.pools).accounts({
                    signer: publicKey
                }).transaction();
                const bid = await program.methods.bid(globalDataAccount.pools, 0).accounts({
                    signer: publicKey
                }).transaction();
                transaction.add(release, bid);
            } else {
                const bid = await program.methods.bid(globalDataAccount.pools, 0).accounts({
                    signer: publicKey
                }).transaction();
                transaction.add(bid);
            }
        }
        await sendTransaction(transaction);
        setOnBid(epoch, didRelease);
    }


    const claim = async () => {
        let transaction = new Transaction();
        const signerTokenAccountAddress = getAssociatedTokenAddressSync(globalDataAccount.mint, publicKey)
        const create = createAssociatedTokenAccountIdempotentInstruction(
            publicKey,
            signerTokenAccountAddress,
            publicKey,
            globalDataAccount.mint,
        );
        transaction.add(create)
        for (const account of userBidAccounts) {
            const claim = await program.methods.claim(account.pool, account.accountId).accounts({
                signer: publicKey,
                signerTokenAccount: signerTokenAccountAddress
            }).transaction();
            transaction.add(create, claim);
            if (transaction.instructions.length >= 8) {
                await sendTransaction(transaction);
                transaction = new Transaction()
                const create = createAssociatedTokenAccountIdempotentInstruction(
                    publicKey,
                    signerTokenAccountAddress,
                    publicKey,
                    globalDataAccount.mint,
                );
                transaction.add(create)
            }
        }
        if (transaction.instructions.length > 0) {
            await sendTransaction(transaction);
        }
        setOnClaim();
    }
    const deposit = async (amount: number) => {
        const signerTokenAccount = getAssociatedTokenAddressSync(globalDataAccount.mint, publicKey);
        const deposit = new BN(amount).mul(new BN(10 ** mintData.decimals));
        const transaction = await program.methods.depositToken(deposit).accounts({
            signer: publicKey,
            signerTokenAccount,
        }).transaction();
        await sendTransaction(transaction);
    }
    const withdraw = async (amount: number) => {
        const signerTokenAccount = getAssociatedTokenAddressSync(globalDataAccount.mint, publicKey);
        const withdraw = new BN(amount).mul(new BN(10 ** mintData.decimals));
        const transaction = await program.methods.withdrawToken(withdraw).accounts({
            signer: publicKey,
            signerTokenAccount
        }).transaction();
        await sendTransaction(transaction);
    }
    return (
        <ProgramActionsContext.Provider value={{
            initialize,
            modifyGlobalData,
            bid,
            claim,
            deposit,
            withdraw
        }}>
            {children}
        </ProgramActionsContext.Provider>
    )
}

export function useProgramActions() {
    const context = useContext(ProgramActionsContext);
    if (!context) {
        throw new Error("Must be used within context provider");
    }
    return context;
}