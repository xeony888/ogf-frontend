import BasicButton from "@/components/BasicButton";
import { useProgramActions } from "@/components/hooks/ProgramActionsProvider"
import { useProgramData } from "@/components/hooks/ProgramData";
import StyledInput from "@/components/StyledInput";
import { useEffect, useState } from "react";



export default function Admin() {
    const { initialize, modifyGlobalData } = useProgramActions();
    const { globalDataAccount, initialized } = useProgramData();
    const [fee, setFee] = useState<number>(0);
    const [releaseLength, setReleaseLength] = useState<number>(0);
    const [maxTimeBetweenBids, setMaxTimeBetweenBids] = useState<number>(0);
    const [releaseAmount, setReleaseAmount] = useState<number>(0);

    useEffect(() => {
        if (globalDataAccount) {
            setFee(globalDataAccount.fee.toNumber())
            setReleaseLength(globalDataAccount.releaseLength.toNumber());
            setMaxTimeBetweenBids(globalDataAccount.maxTimeBetweenBids.toNumber());
        }
    }, [globalDataAccount]);

    return (
        <div className="flex flex-col justify-center items-center gap-4 w-[80%] pt-2">
            <BasicButton onClick={initialize} text="Initialize" disabled={initialized} />
            <BasicButton onClick={() => modifyGlobalData(fee, releaseLength, maxTimeBetweenBids)} text="Modify Global Data" />
            <div className="flex flex-row justify-center items-center gap-2">
                <StyledInput
                    placeholder="Fee"
                    type="number"
                    value={fee}
                    onChange={(event: any) => setFee(Number(event.target.value))}
                />
                <StyledInput
                    placeholder="Release Length"
                    type="number"
                    value={releaseLength}
                    onChange={(event: any) => setReleaseLength(Number(event.target.value))}
                />
                <StyledInput
                    placeholder="Max Time Between Bids"
                    type="number"
                    value={maxTimeBetweenBids}
                    onChange={(event: any) => setMaxTimeBetweenBids(Number(event.target.value))}
                />
                <StyledInput
                    placeholder="Release Amount"
                    type="number"
                    value={releaseAmount}
                    onChange={(event: any) => setReleaseAmount(Number(event.target.value))}
                />
            </div>
            <p>Token Mint: {globalDataAccount?.mint.toString()}</p>
            <p>Pool #: {globalDataAccount?.pools.toString()}</p>
        </div>
    )
}