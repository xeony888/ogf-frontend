import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { getAccount, getMint, Mint } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BN, min } from "bn.js";
import { useProgram } from "./ProgramProvider";
import { calculateNextReleaseAmount, calculateNextReleaseAmountRaw, calculateReward } from "../utils";
import { useRouter } from "next/router";
type GlobalData = {
    mint: PublicKey,
    pools: number,
    fee: InstanceType<typeof BN>,
    releaseLength: InstanceType<typeof BN>,
    maxTimeBetweenBids: InstanceType<typeof BN>,
    releaseAmount: InstanceType<typeof BN>,
    totalReleases: InstanceType<typeof BN>
    claimExpiryTime: InstanceType<typeof BN>
}
type PoolAccount = {
    id: number,
    bidDeadline: InstanceType<typeof BN>,
    bids: number,
    releaseTime: InstanceType<typeof BN>,
    balance: InstanceType<typeof BN>,
}
type BidAccount = {
    bidder: PublicKey,
    pool: number,
    accountId: number,
    bidIds: number[],
}
type UserData = {
    currentReward: InstanceType<typeof BN>,
}
const DEFAULT_USER_DATA: UserData = {
    currentReward: new BN(0),
}
type ProgramDataProps = {
    initialized: boolean,
    globalDataAccount: GlobalData,
    currentPoolAccount: PoolAccount,
    programTokenBalance: bigint,
    userBidAccounts: BidAccount[],
    mintData: Mint,
    userData: UserData,
    amountToClaim: InstanceType<typeof BN>,
    setOnBid: (epoch: boolean, release: boolean) => void,
    setOnClaim: () => void,
}
const ProgramDataContext = createContext<ProgramDataProps>({} as ProgramDataProps);
const poolsMap = new Map<number, PoolAccount>();
export function ProgramDataProvider({ children }: { children: React.ReactNode }) {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [globalDataAccount, setGlobalDataAccount] = useState<GlobalData>();
    const [currentPoolAccount, setCurrentPoolAccount] = useState<PoolAccount>();
    const [programTokenBalance, setProgramTokenBalance] = useState<bigint>(BigInt(0));
    const [userBidAccounts, setUserBidAccounts] = useState<BidAccount[]>([]);
    const [amountToClaim, setAmountToClaim] = useState<InstanceType<typeof BN>>(new BN(0));
    const [mintData, setMintData] = useState<Mint>();
    const [userData, setUserData] = useState<UserData>(DEFAULT_USER_DATA);
    const initialized: boolean = useMemo(() => {
        return !!globalDataAccount;
    }, [globalDataAccount])
    const { program } = useProgram();
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
                console.log(globalDataAccount.totalReleases.toNumber())
                setGlobalDataAccount(globalDataAccount)
                setProgramTokenBalance(programTokenAccount.amount);
            })()
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
                const data = await getMint(connection, globalDataAccount.mint);
                console.log({ mintData: data })
                setMintData(data);
            })();
        }
    }, [globalDataAccount]);
    useEffect(() => {
        if (globalDataAccount && publicKey && currentPoolAccount) {
            (async () => {
                let claimAccounts = await program.account.bidAccount.all([
                    {
                        memcmp: {
                            offset: 8 + 2 + 2,
                            bytes: publicKey.toBase58()
                        }
                    }
                ]);
                let poolAccounts = await program.account.pool.all();
                const currentAccounts = claimAccounts.filter((account) => account.account.pool === globalDataAccount.pools);
                let currentReward = new BN(0);
                for (const account of currentAccounts) {
                    let amount: InstanceType<typeof BN> = new BN(0);
                    for (const bidId of account.account.bidIds) {
                        const result = calculateReward(new BN(currentPoolAccount.bids), new BN(bidId), currentPoolAccount.balance);
                        amount = amount.add(result)
                    }
                    currentReward = currentReward.add(amount);
                }
                setUserData(userData => {
                    return { ...userData, currentReward, }
                });
                claimAccounts = claimAccounts.filter((account) => account.account.pool !== globalDataAccount.pools);
                let amountToClaim = new BN(0);
                for (const account of claimAccounts) {
                    const poolAccount = poolAccounts.find(acc => acc.account.id === account.account.pool);
                    if (poolAccount.account.bidDeadline.add(globalDataAccount.claimExpiryTime).gtn(Math.floor(Date.now() / 1000))) {
                        let poolAccount = poolsMap.get(account.account.pool);
                        if (!poolAccount) {
                            const [poolAddress] = PublicKey.findProgramAddressSync(
                                [Buffer.from("pool"), new BN(account.account.pool).toArrayLike(Buffer, "le", 2)],
                                program.programId
                            );
                            poolAccount = await program.account.pool.fetch(poolAddress);
                            poolsMap.set(account.account.pool, poolAccount);
                        }
                        let amount: InstanceType<typeof BN> = new BN(0);
                        for (const bidId of account.account.bidIds) {
                            const reward = calculateReward(new BN(poolAccount.bids), new BN(bidId), poolAccount.balance);
                            amount = amount.add(reward);
                        }
                        amountToClaim = amountToClaim.add(amount);
                    }
                }
                setUserBidAccounts(claimAccounts.map(account => account.account));
                setAmountToClaim(amountToClaim);
            })();
        }
    }, [globalDataAccount, publicKey, currentPoolAccount])
    const setOnClaim = async () => {
        setAmountToClaim(new BN(0));
    }
    const setOnBid = async (epoch: boolean, release: boolean) => {
        const time = new BN(Math.floor(Date.now() / 1000))
        if (epoch) {
            setGlobalDataAccount(globalDataAccount => {
                return {
                    ...globalDataAccount,
                    pools: globalDataAccount.pools + 1
                }
            })
            const released = calculateNextReleaseAmountRaw(new BN(0), globalDataAccount.releaseAmount);
            const newBidDeadline = time.div(globalDataAccount.maxTimeBetweenBids).addn(2).mul(globalDataAccount.maxTimeBetweenBids)
            setCurrentPoolAccount({
                id: globalDataAccount.pools,
                bidDeadline: newBidDeadline,
                bids: 1,
                releaseTime: time.add(globalDataAccount.releaseLength),
                balance: new BN(released),
            })
        } else if (release) {
            const released = calculateNextReleaseAmountRaw(globalDataAccount.totalReleases.addn(1), globalDataAccount.releaseAmount);
            setCurrentPoolAccount(curr => {
                const newBidDeadline = time.div(globalDataAccount.maxTimeBetweenBids).addn(2).mul(globalDataAccount.maxTimeBetweenBids)
                return {
                    ...curr,
                    balance: curr.balance.add(released),
                    bids: curr.bids + 1,
                    releaseTime: time.add(globalDataAccount.releaseLength),
                    bidDeadline: newBidDeadline
                }
            });
            setGlobalDataAccount(global => {
                return {
                    ...global,
                    totalReleases: global.totalReleases.add(new BN(1))
                }
            })
        } else {
            setCurrentPoolAccount(curr => {
                const newBidDeadline = time.div(globalDataAccount.maxTimeBetweenBids).addn(2).mul(globalDataAccount.maxTimeBetweenBids)
                return {
                    ...curr,
                    bids: curr.bids + 1,
                    bidDeadline: newBidDeadline,
                }
            })
        }
    }
    return (
        <ProgramDataContext.Provider value={{
            initialized,
            globalDataAccount,
            programTokenBalance,
            currentPoolAccount,
            userBidAccounts,
            amountToClaim,
            mintData,
            userData,
            setOnBid,
            setOnClaim,
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