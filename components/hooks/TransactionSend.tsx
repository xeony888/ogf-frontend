import { createContext, useContext, useState } from "react";
import { Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

type TransactionSendProps = {
    sendTransaction: (t: Transaction) => Promise<void>
}
const TransactionSendContext = createContext<TransactionSendProps>({} as TransactionSendProps);
let timeout: any;
export function TransactionSendProvider({ children }: { children: React.ReactNode }) {
    const { connection } = useConnection();
    const { publicKey, signTransaction } = useWallet();
    const [transactionError, setTransactionError] = useState<boolean>(false);
    const [transactionSuccess, setTransactionSuccess] = useState<boolean>(false);
    const [sendingTransaction, setSendingTransaction] = useState<boolean>(false);
    const [signingTransaction, setSigningTransaction] = useState<boolean>(false);
    const [sig, setSig] = useState<string>("");
    const sendTransaction = async (t: Transaction) => {
        if (!publicKey || !signTransaction) return;
        let sig: string = "";
        let errored: boolean = false;
        let error: any;
        setTransactionError(false);
        setTransactionSuccess(false);
        setSendingTransaction(false);
        try {
            clearTimeout(timeout)
            setSendingTransaction(true);
            const blockhash = await connection.getLatestBlockhash();
            t.recentBlockhash = blockhash.blockhash;
            t.feePayer = publicKey
            setSigningTransaction(true)
            const signed = await signTransaction(t);
            setSigningTransaction(false);
            sig = await connection.sendRawTransaction(signed.serialize());
            await connection.confirmTransaction({
                blockhash: blockhash.blockhash,
                lastValidBlockHeight: blockhash.lastValidBlockHeight,
                signature: sig
            });
            setTransactionSuccess(true);
        } catch (e) {
            console.error(e);
            setTransactionError(true);
            errored = true;
            error = e;
        } finally {
            setSig(sig);
            timeout = setTimeout(() => {
                setTransactionError(false);
                setTransactionSuccess(false);
                setSendingTransaction(false);
            }, 3000);
            if (errored) {
                throw new Error(error);
            }
        }
    }
    return (
        <TransactionSendContext.Provider value={{ sendTransaction }}>
            <div className="w-auto h-auto">
                {children}
                {sendingTransaction &&
                    <div className="fixed bottom-0 z-50 left-0 m-4 border-2 border-green-500 rounded-lg w-auto gap-4 p-4 h-24 flex flex-row justify-center items-center text-white">
                        {!transactionError && !transactionSuccess ?
                            <>
                                <Spinner />
                                {signingTransaction ?
                                    <p>Waiting for transaction signature</p>
                                    :
                                    <p>Sending Transaction...</p>
                                }
                            </>
                            :
                            <>
                                {transactionError ?
                                    <p>❌</p>
                                    :
                                    <p>✅</p>
                                }
                                <p>Signature: <a className="hover:underline text-white font-bold" href={`https://solscan.io/tx/${sig}`} target="_blank">{shorten(sig)}</a></p>
                            </>
                        }
                    </div>
                }
            </div>
        </TransactionSendContext.Provider>
    )
}
function shorten(sig: string) {
    return `${sig.substring(0, 4)}...${sig.substring(sig.length - 4, sig.length)}`
}
interface SpinnerProps {
    size?: number; // Size of the spinner in pixels
}
const Spinner: React.FC<SpinnerProps> = ({ size = 40 }) => {
    return (
        <div
            className="border-4 border-t-transparent border-solid rounded-full animate-spin"
            style={{
                width: size,
                height: size,
                borderWidth: size / 10, // Adjust the border width relative to the size
            }}
        ></div>
    );
};

export function useTransactionSend() {
    const context = useContext(TransactionSendContext);
    if (!context) {
        throw new Error("Context not found");
    }
    return context
}