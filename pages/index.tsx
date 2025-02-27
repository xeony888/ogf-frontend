import BasicButton from "@/components/BasicButton";
import BigText from "@/components/BigText";
import Countdown from "@/components/Countdown";
import GradientBorder from "@/components/GradientBorder";
import { useProgramActions } from "@/components/hooks/ProgramActionsProvider";
import { useProgramData } from "@/components/hooks/ProgramData";
import LoadedText from "@/components/LoadedText";
import { calculateBidCost, calculateNextReleaseAmount, displayTokenValue } from "@/components/utils";
import WalletButton from "@/components/WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";



type PageState = "INFO" | "BID" | "CLAIM" | "STATS"
export default function Home() {
  const { publicKey } = useWallet();
  const { amountToClaim, currentPoolAccount, globalDataAccount, mintData, userData } = useProgramData();
  const { claim, bid } = useProgramActions();
  const [state, setState] = useState<PageState>();
  const router = useRouter();
  useEffect(() => {
    if (router && router.isReady) {
      const { state } = router.query;
      if (state) {
        setState(state as any);
      }
    }
  }, [router, router.isReady])
  useEffect(() => {
    if (state) {
      router.push(
        {
          pathname: router.pathname,
          query: { ...router.query, state },
        },
        undefined,
        { shallow: true } // Prevents full page reload
      );
    }
  }, [state]);
  const now: BN = useMemo(() => {
    return new BN(Date.now() / 1000);
  }, []);
  const bidCost: number = useMemo(() => {
    if (!currentPoolAccount || !globalDataAccount) return 0;
    return calculateBidCost(globalDataAccount.fee, new BN(currentPoolAccount.bids));
  }, [currentPoolAccount, globalDataAccount]);
  const nextReleaseAmount: number = useMemo(() => {
    if (!currentPoolAccount || !globalDataAccount || !mintData) return 0;
    return calculateNextReleaseAmount(currentPoolAccount.releases.add(new BN(1)), globalDataAccount.releaseAmount, mintData.decimals);
  }, [currentPoolAccount, globalDataAccount, mintData]);

  return (
    <div className="flex flex-col justify-center items-center gap-2 md:gap-3 xl:gap-6 px-3 md:px-6 mt-6 w-full h-full relative">
      {!publicKey &&
        <div className="flex justify-center items-start w-full h-full absolute top-0 left-0 bg-black/80">
          <div className="flex flex-col p-10 gap-5 justify-center items-center bg-black border-green-500 border-2 rounded-lg mt-10">
            <p>Connect Wallet</p>
            <WalletButton />
          </div>
        </div>
      }
      <div className="grid grid-cols-4 place-items-center items-center w-[90%] lg:w-[70%] xl:w-[60%] gap-4">
        <BasicButton onClick={() => setState("INFO")} text="Info" disabled={state === "INFO"} />
        <BasicButton onClick={() => setState("BID")} text="Bid" disabled={state === "BID"} />
        <BasicButton onClick={() => setState("CLAIM")} text="Claim" disabled={state === "CLAIM"} />
        <BasicButton onClick={() => setState("STATS")} text="Stats" disabled={state === "STATS"} />
      </div>
      <div className="w-full h-full flex justify-center items-center p-2">
        <GradientBorder>
          <div className="w-full h-full flex flex-col justify-between items-center gap-3 md:gap-6">
            <p className="uppercase text-4xl lg:text-6xl font-extrabold">{state}</p>
            {state === "STATS" ?
              <></>
              :
              state === "BID" ?
                <div className="flex flex-col justify-center items-center gap-2">
                  <LoadedText start="Current Pool Balance" text="&%%& $OGF" value={displayTokenValue(currentPoolAccount?.balance, mintData?.decimals)} />
                  <LoadedText start="Current Bid Cost" text="&%%& $SOL" value={bidCost.toString()} />
                  <LoadedText start="Your Current Reward" text="&%%& $OGF" value={displayTokenValue(userData.currentReward, mintData?.decimals)} />
                  <BasicButton onClick={bid} text="Bid" />
                  <div className="flex flex-col justify-center items-center gap-2">
                    <p>Releasing {nextReleaseAmount} $OGF in</p>
                    <Countdown timeLeft={currentPoolAccount?.releaseTime.sub(now).toNumber() || 0} />
                  </div>
                  <div className="flex flex-col justify-center items-center gap-2">
                    <p>Time left to bid before expiry</p>
                    <Countdown timeLeft={currentPoolAccount?.bidDeadline.sub(now).toNumber() || 0} />
                  </div>
                </div>
                :
                state === "CLAIM" ?
                  <div className="flex flex-col justify-center items-center w-[50%] h-full gap-10">
                    <BigText text="Claimable $OGF" number={displayTokenValue(amountToClaim, mintData?.decimals)} />
                    <BasicButton onClick={claim} text="Claim" disabled={amountToClaim.eq(new BN(0))} disabledText="No OGF to claim" />
                  </div>
                  :
                  <></>
            }
            <p>Pool 0x{globalDataAccount?.pools.toString(16)}</p>
          </div>
        </GradientBorder>
      </div>
    </div>
  );
}
