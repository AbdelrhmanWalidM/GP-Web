import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ConsumptionChart = ({ data = [] }) => {
  // Format data for Recharts if it's coming from MongoDB (timestamp -> time)
  const chartData = data.map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    usage: r.load
  })).reverse(); // Reverse to show chronological order if needed

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData.length > 0 ? chartData : [{time: 'N/A', usage: 0}]}>
        <defs>
          <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis 
          dataKey="time" 
          stroke="var(--text-muted)" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis 
          stroke="var(--text-muted)" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(val) => `${val}kW`}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(15, 23, 42, 0.9)', 
            border: '1px solid var(--glass-border)',
            borderRadius: '8px',
            color: 'var(--text-main)'
          }}
          itemStyle={{ color: 'var(--primary)' }}
        />
        <Area 
          type="monotone" 
          dataKey="usage" 
          stroke="var(--primary)" 
          strokeWidth={3}
          fillOpacity={1} 
          fill="url(#colorUsage)" 
          animationDuration={2000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default ConsumptionChart;
