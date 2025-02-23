import WalletButton from "./WalletButton";

export default function NavBar() {
    return (
        <div className="flex flex-row justify-between text-xs md:text-base items-center w-full border-b-4 border-green-500 bg-black/80 p-4">
            <div>
                {/* LOGO */}
                <p className="text-lg">OG Lottery</p>
            </div>
            <div className="flex flex-row justify-center items-center md:gap-2">
                <WalletButton />
            </div>
        </div>
    );
}   