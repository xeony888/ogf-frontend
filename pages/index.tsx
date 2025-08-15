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
    return calculateNextReleaseAmount(globalDataAccount.totalReleases.add(new BN(1)), globalDataAccount.releaseAmount, mintData.decimals);
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
                  <LoadedText start="Number of Bids" value={currentPoolAccount.bids} />
                  <LoadedText start="Pool Reward" text="&%%& $OGF" value={displayTokenValue(currentPoolAccount?.balance, mintData?.decimals)} />
                  <LoadedText start="Lottery Reward" text="&%%& $OGF" value={displayTokenValue(userData.currentReward, mintData?.decimals)} />
                  <LoadedText start="Lottery Cost" text="&%%& $SOL" value={bidCost.toString()} />
                  <BasicButton onClick={bid} text="Bid" />
                  <div className="flex flex-col justify-center items-center gap-2">
                    <p>{nextReleaseAmount} $OGF to be released in</p>
                    <Countdown timeLeft={currentPoolAccount?.releaseTime.sub(now).toNumber() || 0} />
                  </div>
                  <div className="flex flex-col justify-center items-center gap-2">
                    <p>Current pool expires in</p>
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
                  <div className="flex flex-col justify-between items-center text-center w-full h-full">
                    <p>
                      Welcome to the OG Lottery. The Lottery dispenses <ImportantSpan>$OGF</ImportantSpan>, the primal degeneracy of the Realm.
                    </p>
                    <p>
                      <ImportantSpan>80% (800T) $OGF</ImportantSpan> is forever allocated to the lottery.
                    </p>
                    <p>
                      Releases equal <ImportantSpan>1 B $OGF</ImportantSpan>, increasing linearly at a pace of <ImportantSpan>1 B $OGF</ImportantSpan> each epoch. Epochs last for <ImportantSpan>24 hours</ImportantSpan> beginning at <ImportantSpan>00:00 UTC</ImportantSpan>.
                    </p>
                    <p>
                      <ImportantSpan>50%</ImportantSpan> of $OGF rewards are awarded to the Final Bid, and the remaining <ImportantSpan>50%</ImportantSpan> of $OGF is awarded to the losing bids, proportional to bid count. Wallets can bid on a Lottery Pool any number of times. Bid cost increases with each new bid for the length of the Lottery Pool. Difficulty resets each new Pool. Final Bid is determined when a full epoch passes without a Bid.
                    </p>
                    <p>
                      Lottery fees are currently paid in <ImportantSpan>$SOL</ImportantSpan>. <ImportantSpan>$OGG</ImportantSpan> and <ImportantSpan>$OGC</ImportantSpan> will soon be allowed.
                    </p>
                    <p>
                      <ImportantSpan>100% of lottery fees</ImportantSpan> collected go towards repurchasing <ImportantSpan>$OGF</ImportantSpan> from the open market to be burned. <ImportantSpan>$OGF</ImportantSpan> awarded but unclaimed after <ImportantSpan>10 epochs</ImportantSpan> is burned.
                    </p>
                    <p>
                      <ImportantSpan>Those with $OGF bags will test fate and fortune in the Realm of OGs</ImportantSpan>
                    </p>
                  </div>
            }
            <p>Pool 0x{globalDataAccount?.pools.toString(16)}</p>
          </div>
        </GradientBorder>
      </div>
    </div>
  );
}

function ImportantSpan({ children }: { children: React.ReactNode; }) {
  return (
    <span className="text-green-500 font-extrabold drop-shadow-lg">
      {children}
    </span>
  );
}