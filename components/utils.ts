import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import BN from "bn.js";

export function calculateReward(bids: BN, id: BN, amount: BN): BN {
    const sum = bids.mul(bids.add(new BN(1))).div(new BN(2));
    const distance = bids.sub(id);
    return distance.mul(amount).div(sum);
}
export function calculateBidCost(fee: BN, num: BN): number {
    return fee.mul(num.pow(new BN(2))).toNumber() / LAMPORTS_PER_SOL;
}
export function calculateNextReleaseAmount(releases: BN): number {
    return releases.pow(new BN(2)).toNumber() / (10 ** DECIMALS);
}
export const DECIMALS = 6;