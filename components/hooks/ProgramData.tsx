import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { getAccount } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BN } from "bn.js";
import { useProgram } from "./ProgramProvider";
import { calculateReward } from "../utils";
type GlobalData = {
    mint: PublicKey,
    pools: number,
    fee: InstanceType<typeof BN>,
    releaseLength: InstanceType<typeof BN>,
    maxTimeBetweenBids: InstanceType<typeof BN>,
    releaseAmount: InstanceType<typeof BN>,
}
const DEFAULT_GLOBAL_DATA: GlobalData = {
    mint: Keypair.generate().publicKey,
    pools: 0,
    fee: new BN(0),
    releaseAmount: new BN(0),
    releaseLength: new BN(0),
    maxTimeBetweenBids: new BN(0),
}
type PoolAccount = {
    id: number,
    bidDeadline: InstanceType<typeof BN>,
    bids: number,
    releaseTime: InstanceType<typeof BN>,
    releases: InstanceType<typeof BN>,
    balance: InstanceType<typeof BN>,
}
const DEFAULT_POOL_ACCOUNT: PoolAccount = {
    id: 0,
    bidDeadline: new BN(0),
    bids: 0,
    releaseTime: new BN(0),
    releases: new BN(0),
    balance: new BN(0),
}
type ClaimAccount = {
    bidder: PublicKey,
    pool: number,
    bidId: number,
}
type ProgramDataProps = {
    initialized: boolean,
    globalDataAccount: GlobalData,
    currentPoolAccount: PoolAccount,
    programTokenBalance: bigint,
    userClaimAccounts: ClaimAccount[],
    amountToClaim: InstanceType<typeof BN>,
}
const ProgramDataContext = createContext<ProgramDataProps>({} as ProgramDataProps);

export function ProgramDataProvider({ children }: { children: React.ReactNode }) {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [globalDataAccount, setGlobalDataAccount] = useState<GlobalData>();
    const [currentPoolAccount, setCurrentPoolAccount] = useState<PoolAccount>();
    const [programTokenBalance, setProgramTokenBalance] = useState<bigint>(BigInt(0));
    const [userClaimAccounts, setUserClaimAccounts] = useState<ClaimAccount[]>([]);
    const [amountToClaim, setAmountToClaim] = useState<InstanceType<typeof BN>>(new BN(0));
    const initialized: boolean = useMemo(() => {
        return !!globalDataAccount;
    }, [globalDataAccount])
    const { program, provider } = useProgram();
    useEffect(() => {
        if (program) {

            const [globalDataAccountAddress] = PublicKey.findProgramAddressSync(
                [Buffer.from("global")],
                program.programId
            );
            const [programTokenAccountAddress] = PublicKey.findProgramAddressSync(
                [Buffer.from("token")],
                program.programId
            );
            (async () => {
                const programTokenAccount = await getAccount(connection, programTokenAccountAddress);
                const globalDataAccount = await program.account.globalData.fetch(globalDataAccountAddress);
                setGlobalDataAccount(globalDataAccount)
                setProgramTokenBalance(programTokenAccount.amount);
            })()
        } else {
            console.log("no program");
        }
    }, [program]);
    useEffect(() => {
        if (globalDataAccount) {
            (async () => {
                const [poolAccountAddress] = PublicKey.findProgramAddressSync(
                    [Buffer.from("pool"), new BN(globalDataAccount.pools).toArrayLike(Buffer, "le", 2)],
                    program.programId
                );
                const poolAccount = await program.account.pool.fetch(poolAccountAddress);
                setCurrentPoolAccount(poolAccount)
            })();
        }
    }, [globalDataAccount]);
    useEffect(() => {
        if (globalDataAccount && publicKey) {
            (async () => {
                let claimAccounts = await program.account.bidAccount.all([
                    {
                        memcmp: {
                            offset: 8 + 2 + 2,
                            bytes: publicKey.toBase58()
                        }
                    }
                ]);
                claimAccounts = claimAccounts.filter((account) => account.account.pool !== globalDataAccount.pools);
                let amountToClaim = new BN(0);
                const poolsMap = new Map<number, PoolAccount>();
                for (const account of claimAccounts) {
                    let poolAccount = poolsMap.get(account.account.pool);
                    if (!poolAccount) {
                        const [poolAddress] = PublicKey.findProgramAddressSync(
                            [Buffer.from("pool"), new BN(account.account.pool).toArrayLike(Buffer, "le", 2)],
                            program.programId
                        );
                        poolAccount = await program.account.pool.fetch(poolAddress);
                        poolsMap.set(account.account.pool, poolAccount);
                    }
                    const amount = calculateReward(new BN(poolAccount.bids), new BN(account.account.bidId), poolAccount.balance);
                    amountToClaim = amountToClaim.add(amount);
                }
                setUserClaimAccounts(claimAccounts.map(account => account.account));
                setAmountToClaim(amountToClaim);
            })();
        }
    }, [globalDataAccount, publicKey])
    return (
        <ProgramDataContext.Provider value={{
            initialized,
            globalDataAccount,
            programTokenBalance,
            currentPoolAccount,
            userClaimAccounts,
            amountToClaim
        }}>
            {children}
        </ProgramDataContext.Provider>
    )
}

export function useProgramData() {
    const context = useContext(ProgramDataContext);
    if (!context) {
        throw new Error("Must be used within a ProgramDataProvider");
    }
    return context;
}