
import { AnchorProvider, Program, Provider } from "@coral-xyz/anchor";
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import idl from "../idl/ogf_lottery.json";
import { OgfLottery } from "../idl/ogf_lottery";
import { useConnection } from "@solana/wallet-adapter-react";
type ProgramProps = {
    provider: Provider,
    program: Program<OgfLottery>
}
const ProgramContext = createContext<ProgramProps>({} as ProgramProps);
export default function ProgramProvider({ children }: { children: React.ReactNode }) {
    const { connection } = useConnection();
    const [provider, setProvider] = useState<Provider>();
    const [program, setProgram] = useState<Program<OgfLottery>>();
    useEffect(() => {
        const provider = new AnchorProvider(connection, (window as any).solana);
        const program = new Program<OgfLottery>(idl as any, provider);
        setProgram(program);
        setProvider(provider);
    }, []);
    return (
        <ProgramContext.Provider value={{
            provider,
            program
        }}>
            {children}
        </ProgramContext.Provider>
    )
}

export function useProgram() {
    const context = useContext(ProgramContext);
    if (!context) {
        throw new Error("Must be used within context provider")
    }
    return context;
}