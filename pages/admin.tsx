import BasicButton from "@/components/BasicButton";
import { useProgramActions } from "@/components/hooks/ProgramActionsProvider"
import { useProgramData } from "@/components/hooks/ProgramData";
import StyledInput from "@/components/StyledInput";
import { displayTokenValue } from "@/components/utils";
import BN from "bn.js";
import { useEffect, useState } from "react";



export default function Admin() {
    const { initialize, modifyGlobalData, withdraw, deposit } = useProgramActions();
    const { globalDataAccount, initialized, programTokenBalance, mintData } = useProgramData();
    const [fee, setFee] = useState<number>(0);
    const [releaseLength, setReleaseLength] = useState<number>(0);
    const [maxTimeBetweenBids, setMaxTimeBetweenBids] = useState<number>(0);
    const [releaseAmount, setReleaseAmount] = useState<number>(0);
    const [depositAmount, setDepositAmount] = useState<number>(0);
    const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
    useEffect(() => {
        if (globalDataAccount) {
            setFee(globalDataAccount.fee.toNumber())
            setReleaseLength(globalDataAccount.releaseLength.toNumber());
            setMaxTimeBetweenBids(globalDataAccount.maxTimeBetweenBids.toNumber());
            setReleaseAmount(globalDataAccount.releaseAmount.toNumber());
        }
    }, [globalDataAccount]);

    return (
        <div className="flex flex-col justify-center items-center gap-4 w-[80%] pt-2">
            <BasicButton onClick={initialize} text="Initialize" disabled={initialized} />
            <BasicButton onClick={() => modifyGlobalData(fee, releaseLength, maxTimeBetweenBids, releaseAmount)} text="Modify Global Data" />
            <div className="flex flex-row justify-center items-center gap-2">
                <div className="flex flex-col justify-center items-center gap-2">
                    <p>Base Fee:</p>
                    <StyledInput
                        placeholder="Fee"
                        type="number"
                        value={fee}
                        onChange={(event: any) => setFee(Number(event.target.value))}
                    />
                </div>
                <div className="flex flex-col justify-center items-center gap-2">
                    <p>Time between release:</p>
                    <StyledInput
                        placeholder="Release Length"
                        type="number"
                        value={releaseLength}
                        onChange={(event: any) => setReleaseLength(Number(event.target.value))}
                    />
                </div>
                <div className="flex flex-col justify-center items-center gap-2">
                    <p>Max time between bids:</p>
                    <StyledInput
                        placeholder="Max Time Between Bids"
                        type="number"
                        value={maxTimeBetweenBids}
                        onChange={(event: any) => setMaxTimeBetweenBids(Number(event.target.value))}
                    />
                </div>
                <div className="flex flex-col justify-center items-center gap-2">
                    <p>Release Amount:</p>
                    <StyledInput
                        placeholder="Release Amount"
                        type="number"
                        value={releaseAmount}
                        onChange={(event: any) => setReleaseAmount(Number(event.target.value))}
                    />
                </div>

            </div>
            <p>Token Mint: {globalDataAccount?.mint.toString()}</p>
            <p>Pool #: {globalDataAccount?.pools.toString()}</p>
            <p>Program Token Balance: {displayTokenValue(new BN(programTokenBalance.toString()), mintData?.decimals)}</p>
            <div className="flex flex-row justify-center items-center gap-2">
                <div className="flex flex-col justify-center items-center gap-2">
                    <StyledInput
                        placeholder="Deposit Amount"
                        type="number"
                        value={depositAmount}
                        onChange={(event: any) => setDepositAmount(Number(event.target.value))}
                    />
                    <BasicButton onClick={() => deposit(depositAmount)} text="Deposit" />
                </div>
                <div className="flex flex-col justify-center items-center gap-2">
                    <StyledInput
                        placeholder="Withdraw Amount"
                        type="number"
                        value={withdrawAmount}
                        onChange={(event: any) => setWithdrawAmount(Number(event.target.value))}
                    />
                    <BasicButton onClick={() => withdraw(withdrawAmount)} text="Withdraw" />
                </div>
            </div>
        </div>
    )
}