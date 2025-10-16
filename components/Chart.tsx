import React from "react";
import { CartesianGrid, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Line } from "recharts";



export default function Chart({ data }: { data: any; }) {
    return (
        <div className="w-full flex flex-row justify-center items-center gap-2">
            <ResponsiveContainer width={"50%"} height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="id" />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                    />
                    <YAxis
                        yAxisId="left"
                        label={{ value: "$OGF * 10^6", angle: -90, position: "insideLeft", offset: 10 }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="totalBids" yAxisId="right" stroke="#82ca9d" />
                    <Line type="monotone" dataKey="totalPoolSize" yAxisId="left" stroke="#ffc658" />
                </LineChart>
            </ResponsiveContainer>
            <ResponsiveContainer width={"50%"} height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="id"
                        label={{ value: "$OGF * 10^6", angle: -90, position: "insideLeft", offset: 10 }}

                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        label={{ value: "$OGF * 10^6", angle: -90, position: "insideLeft", offset: 10 }}
                    />
                    <YAxis yAxisId="left" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="totalUnreleasedOgf" yAxisId="right" stroke="#ff0000" />
                    <Line type="monotone" dataKey="totalRepurchasedOgf" yAxisId="right" stroke="#8884d8" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}