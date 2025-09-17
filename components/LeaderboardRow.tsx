import { shortenAddress } from "./WalletButton";

export default function LeaderboardRow({ row }: { row: any }) {
    return (
        <div className="grid grid-cols-3 w-full">
            <p>{shortenAddress(row.wallet)}</p>
            <p>{row.claimed}</p>
            <p>{row.timesBid}</p>
        </div>
    )
}