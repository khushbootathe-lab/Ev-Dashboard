// src/App.jsx
import React, { useState, useMemo } from "react";
import useDataLoader from "./hooks/useDataLoader";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A020F0", "#FF6384"];

export default function App() {
  const { raw, loading, error } = useDataLoader("/data/ev_data.csv");

  const [filters, setFilters] = useState({ year: "All", state: "All" });

  // --- Process and clean data ---
  const data = useMemo(() => {
    if (!raw) return [];
    return raw.map(r => ({
      year: Number(r["Model Year"]) || null,
      state: r.State || "Unknown",
      make: r.Make || "Unknown",
      model: r.Model || "Unknown",
      vehicle_type: r["Electric Vehicle Type"] || "Other",
      battery_capacity_kwh: Number(r["Electric Range"]) || 0
    })).filter(r => r.year);
  }, [raw]);

  // --- Filtered data ---
  const filteredData = useMemo(() => {
    return data.filter(d => 
      (filters.year === "All" || d.year === Number(filters.year)) &&
      (filters.state === "All" || d.state === filters.state)
    );
  }, [data, filters]);

  // --- KPIs ---
  const total = filteredData.length;
  const thisYear = filteredData.filter(d => d.year === new Date().getFullYear()).length;
  const avgBattery = Math.round((filteredData.reduce((s,d) => s + d.battery_capacity_kwh,0)/Math.max(1,filteredData.length))*100)/100;

  // --- Time series ---
  const yearly = useMemo(() => {
    const map = {};
    filteredData.forEach(d => { map[d.year] = (map[d.year] || 0) + 1; });
    return Object.entries(map).map(([year, count]) => ({ year: Number(year), count })).sort((a,b)=>a.year-b.year);
  }, [filteredData]);

  // --- Top states ---
  const topStates = useMemo(() => {
    const map = {};
    filteredData.forEach(d => { map[d.state] = (map[d.state] || 0) + 1; });
    return Object.entries(map).map(([state, count]) => ({ state, count })).sort((a,b)=>b.count-a.count).slice(0,10);
  }, [filteredData]);

  // --- Vehicle types ---
  const vehicleTypes = useMemo(() => {
    const map = {};
    filteredData.forEach(d => { map[d.vehicle_type] = (map[d.vehicle_type] || 0) + 1; });
    return Object.entries(map).map(([type, value]) => ({ type, value }));
  }, [filteredData]);

  if (loading) return <div className="p-6">Loading data...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  // --- Dropdown options ---
  const years = ["All", ...Array.from(new Set(data.map(d=>d.year))).sort((a,b)=>a-b)];
  const states = ["All", ...Array.from(new Set(data.map(d=>d.state))).sort()];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="max-w-7xl mx-auto mb-6">
        <h1 className="text-3xl font-bold">EV Population Dashboard</h1>
        <p className="text-gray-600">Interactive insights into electric vehicle adoption</p>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-6 flex gap-4">
        <select 
          className="p-2 border rounded"
          value={filters.year} 
          onChange={e=>setFilters(f=>({...f, year:e.target.value}))}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <select 
          className="p-2 border rounded"
          value={filters.state} 
          onChange={e=>setFilters(f=>({...f, state:e.target.value}))}
        >
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <main className="max-w-7xl mx-auto grid grid-cols-12 gap-6">
        {/* KPIs */}
        <div className="col-span-12 grid grid-cols-3 gap-4">
          <KPI title="Total EVs" value={total.toLocaleString()} />
          <KPI title="Registered This Year" value={thisYear.toLocaleString()} />
          <KPI title="Avg Electric Range (miles)" value={avgBattery} />
        </div>

        {/* Charts */}
        <div className="col-span-6 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Registrations by Year</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={yearly}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="year"/>
              <YAxis/>
              <Tooltip/>
              <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-6 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Top 10 States</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topStates} layout="vertical">
              <XAxis type="number"/>
              <YAxis dataKey="state" type="category"/>
              <Tooltip/>
              <Bar dataKey="count" fill="#10B981"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-6 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Vehicle Type Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={vehicleTypes} dataKey="value" nameKey="type" outerRadius={100} label>
                {vehicleTypes.map((entry,index)=>(
                  <Cell key={entry.type} fill={COLORS[index % COLORS.length]}/>
                ))}
              </Pie>
              <Tooltip/>
              <Legend/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Data Table */}
        <div className="col-span-12 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Raw Data Sample</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border">Year</th>
                  <th className="px-4 py-2 border">State</th>
                  <th className="px-4 py-2 border">Make</th>
                  <th className="px-4 py-2 border">Model</th>
                  <th className="px-4 py-2 border">Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0,20).map((row,i)=>(
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">{row.year}</td>
                    <td className="px-4 py-2 border">{row.state}</td>
                    <td className="px-4 py-2 border">{row.make}</td>
                    <td className="px-4 py-2 border">{row.model}</td>
                    <td className="px-4 py-2 border">{row.vehicle_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function KPI({ title, value }) {
  return (
    <div className="bg-white p-4 rounded shadow text-center">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
