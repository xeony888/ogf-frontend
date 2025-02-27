import { createContext, DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES, useContext } from "react";
import { useProgram } from "./ProgramProvider";
import { useWallet } from "@solana/wallet-adapter-react";
import { useTransactionSend } from "./TransactionSend";
import { BN } from "bn.js";
import { useProgramData } from "./ProgramData";
import { PublicKey, Transaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";


type ProgramActionsProps = {
    initialize: () => Promise<void>,
    modifyGlobalData: (fee: number, releaseLength: number, maxTimeBetweenBids: number, releaseAmount: number) => Promise<void>
    bid: () => Promise<void>,
    claim: () => Promise<void>,
    deposit: (amount: number) => Promise<void>,
    withdraw: (amount: number) => Promise<void>,
}
const ProgramActionsContext = createContext<ProgramActionsProps>({} as ProgramActionsProps);
export default function ProgramActionsProvider({ children }: { children: React.ReactNode }) {
    const { publicKey } = useWallet();
    const { program, provider } = useProgram();
    const { sendTransaction } = useTransactionSend();
    const { globalDataAccount, currentPoolAccount, userClaimAccounts, mintData, setOnBid, setOnClaim } = useProgramData();
    const initialize = async () => {
        const transaction = await program.methods.initialize().accounts({
            signer: publicKey
        }).transaction();
        await sendTransaction(transaction);
    }
    const modifyGlobalData = async (fee: number, releaseLength: number, maxTimeBetweenBids: number, releaseAmount: number) => {
        const transaction = await program.methods.modifyGlobalData(new BN(fee), new BN(releaseLength), new BN(maxTimeBetweenBids), new BN(releaseAmount)).accounts({
            signer: publicKey
        }).transaction();
        await sendTransaction(transaction);
    }
    const bid = async () => {
        const transaction = new Transaction();
        const time = new BN(Math.floor(Date.now() / 1000));
        let didRelease = false;
        let epoch = false;
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
            const bid = await program.methods.bid(globalDataAccount.pools + 1, 0).accounts({
                signer: publicKey
            }).transaction();
            transaction.add(newPool, release, bid);
        } else {
            if (time.gt(currentPoolAccount.releaseTime)) {
                didRelease = true;
                const release = await program.methods.release(globalDataAccount.pools).accounts({
                    signer: publicKey
                }).transaction();
                const bid = await program.methods.bid(globalDataAccount.pools, currentPoolAccount.bids).accounts({
                    signer: publicKey
                }).transaction();
                transaction.add(release, bid);
            } else {
                const bid = await program.methods.bid(globalDataAccount.pools, currentPoolAccount.bids).accounts({
                    signer: publicKey
                }).transaction();
                transaction.add(bid);
            }
        }
        await sendTransaction(transaction);
        setOnBid(epoch, didRelease);
    }
    const claim = async () => {
        const transaction = new Transaction();
        const signerTokenAccountAddress = getAssociatedTokenAddressSync(globalDataAccount.mint, publicKey)
        for (const account of userClaimAccounts) {
            const create = createAssociatedTokenAccountIdempotentInstruction(
                publicKey,
                signerTokenAccountAddress,
                publicKey,
                globalDataAccount.mint,
            );
            const claim = await program.methods.claim(account.pool, account.bidId).accounts({
                signer: publicKey,
                signerTokenAccount: signerTokenAccountAddress
            }).transaction();
            transaction.add(create, claim);
            if (transaction.instructions.length === 6) {
                await sendTransaction(transaction);
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