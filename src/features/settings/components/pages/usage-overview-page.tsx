"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

import type { ChartConfig } from "~/components/ui/chart";
import type { UsageData } from "~/features/usage/actions";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";

import { SettingsSection } from "../ui/settings-section";
import {
  CHART_COLORS,
  formatCost,
  formatTokens,
  StatCard,
  UsagePageLayout,
  useUsagePage,
} from "./usage-shared";

const dailySpendConfig = {
  cost: { label: "Cost", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

function DailySpendChart({ data }: { data: UsageData["dailySpend"] }) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm">No usage data for this period.</p>;
  }

  const chartData = data.map(d => ({
    date: d.date.slice(5),
    cost: d.cost,
  }));

  return (
    <ChartContainer
      config={dailySpendConfig}
      className="aspect-auto h-48 w-full"
    >
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `$${v}`}
          width={48}
        />
        <ChartTooltip
          content={(
            <ChartTooltipContent
              formatter={(value) => {
                return formatCost(Number(value));
              }}
            />
          )}
        />
        <Bar dataKey="cost" fill="var(--color-cost)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

function CostBreakdownChart({ data }: { data: UsageData["categoryBreakdown"] }) {
  const chartData = useMemo(() => {
    const entries = [
      { name: "Prompt", value: data.prompt },
      { name: "Completion", value: data.completion },
      { name: "Web Search", value: data.search },
      { name: "URL Extract", value: data.extract },
      { name: "PDF OCR", value: data.ocr },
      { name: "Utility", value: data.utility },
    ].filter(e => e.value > 0.000001);
    return entries;
  }, [data]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    chartData.forEach((entry, i) => {
      config[entry.name] = {
        label: entry.name,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
    return config;
  }, [chartData]);

  if (chartData.length === 0) {
    return <p className="text-muted-foreground text-sm">No cost data available.</p>;
  }

  return (
    <div className={`
      flex flex-col items-center gap-4
      sm:flex-row sm:gap-8
    `}
    >
      <ChartContainer config={chartConfig} className="aspect-square h-48">
        <PieChart>
          <ChartTooltip
            content={(
              <ChartTooltipContent
                formatter={(value) => {
                  return formatCost(Number(value));
                }}
              />
            )}
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={40}
            outerRadius={70}
            strokeWidth={2}
          >
            {chartData.map((_, i) => (
              <Cell
                key={CHART_COLORS[i % CHART_COLORS.length]}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="flex flex-col gap-1.5 text-sm">
        {chartData.map((entry, i) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-mono">{formatCost(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UsageOverviewPage() {
  const { period, setPeriod, data, isLoading } = useUsagePage();

  return (
    <UsagePageLayout period={period} setPeriod={setPeriod} data={data} isLoading={isLoading}>
      {data && (
        <>
          <SettingsSection title="Overview">
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Total Spend" value={formatCost(data.totalCost)} />
              <StatCard label="Total Messages" value={data.totalMessages.toLocaleString()} />
              <StatCard label="Input Tokens" value={formatTokens(data.totalInputTokens)} />
              <StatCard label="Output Tokens" value={formatTokens(data.totalOutputTokens)} />
            </div>
          </SettingsSection>

          <SettingsSection title="Daily Spend">
            <DailySpendChart data={data.dailySpend} />
          </SettingsSection>

          <SettingsSection title="Cost Breakdown">
            <CostBreakdownChart data={data.categoryBreakdown} />
          </SettingsSection>
        </>
      )}
    </UsagePageLayout>
  );
}
