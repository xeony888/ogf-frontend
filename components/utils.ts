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
export function calculateNextReleaseAmountRaw(releases: BN, releaseAmount: BN) {
    return releaseAmount.mul(releases.pow(new BN(2)))
}
export function calculateNextReleaseAmount(releases: BN, releaseAmount: BN, decimals: number): number {
    return Number((releaseAmount.toNumber() * (releases.pow(new BN(2)).toNumber() / (10 ** decimals))).toFixed(decimals));
}
export function displayTokenValue(value: BN | undefined, decimals: number | undefined): string {
    if (!value || decimals === undefined) return undefined;
    return (value.toNumber() / (10 ** decimals)).toString();
}
export function displaySolValue(value: BN | undefined): string {
    if (!value) return undefined;
    return (value.toNumber() / LAMPORTS_PER_SOL).toString()
}
