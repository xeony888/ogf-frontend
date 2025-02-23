import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import NavBar from "@/components/NavBar";
import { TransactionSendProvider } from "@/components/hooks/TransactionSend";
import ProgramProvider from "@/components/hooks/ProgramProvider";
import { ProgramDataProvider } from "@/components/hooks/ProgramData";
import ProgramActionsProvider from "@/components/hooks/ProgramActionsProvider";
require('@solana/wallet-adapter-react-ui/styles.css');

export default function App({ Component, pageProps }: AppProps) {
  const endpoint = useMemo(() => process.env.NEXT_PUBLIC_RPC_URL!, []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect={true}>
        <WalletModalProvider>
          <ProgramProvider>
            <TransactionSendProvider>
              <ProgramDataProvider>
                <ProgramActionsProvider>
                  <div className="flex flex-col justify-start items-center w-full h-screen " style={{ backgroundImage: `url("/coin-spin-slow.gif")`, backgroundSize: "5%" }}>
                    <NavBar />
                    <Component {...pageProps} />
                  </div>
                </ProgramActionsProvider>
              </ProgramDataProvider>
            </TransactionSendProvider>
          </ProgramProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
