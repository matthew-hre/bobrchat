"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { ChartConfig } from "~/components/ui/chart";
import type { UsageData } from "~/features/usage/actions";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";

import { SettingsSection } from "../ui/settings-section";
import {
  formatCost,
  formatTokens,
  StatCard,
  UsagePageLayout,
  useUsagePage,
} from "./usage-shared";

const TYPE_LABELS: Record<string, string> = {
  title: "Title Generation",
  icon: "Icon Selection",
  metadata: "Metadata",
  tags: "Auto-Tagging",
  handoff: "Handoff Summary",
  search: "Web Searches",
  extract: "URL Extraction",
  ocr: "OCR",
};

const barConfig = {
  cost: { label: "Cost", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

function buildChartData(data: UsageData) {
  const utilityRows = data.utilityUsage.typeBreakdown.map(d => ({
    type: TYPE_LABELS[d.type] ?? d.type,
    cost: d.cost,
    calls: d.calls,
  }));

  const toolRows = [
    { type: TYPE_LABELS.search, cost: data.toolUsage.search.cost, calls: data.toolUsage.search.messageCount },
    { type: TYPE_LABELS.extract, cost: data.toolUsage.extract.cost, calls: data.toolUsage.extract.messageCount },
    { type: TYPE_LABELS.ocr, cost: data.toolUsage.ocr.cost, calls: data.toolUsage.ocr.messageCount },
  ];

  return [...utilityRows, ...toolRows]
    .filter(row => row.cost > 0)
    .sort((a, b) => b.cost - a.cost);
}

function TypeBreakdownChart({ data }: { data: UsageData }) {
  const chartData = buildChartData(data);

  if (chartData.length === 0) {
    return <p className="text-muted-foreground text-sm">No tool usage data.</p>;
  }

  return (
    <ChartContainer
      config={barConfig}
      className="aspect-auto h-48 w-full"
    >
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `$${v}`}
        />
        <YAxis
          type="category"
          dataKey="type"
          tickLine={false}
          axisLine={false}
          width={120}
        />
        <ChartTooltip
          content={(
            <ChartTooltipContent
              formatter={(value, _name, item) => {
                const calls = (item.payload as Record<string, unknown>)?.calls;
                return `${formatCost(Number(value))} (${Number(calls).toLocaleString()} calls)`;
              }}
            />
          )}
        />
        <Bar dataKey="cost" fill="var(--color-cost)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function UsageToolsPage() {
  const { period, setPeriod, data, isLoading } = useUsagePage();

  return (
    <UsagePageLayout period={period} setPeriod={setPeriod} data={data} isLoading={isLoading}>
      {data && (() => {
        const toolTotalCost = data.toolUsage.search.cost + data.toolUsage.extract.cost + data.toolUsage.ocr.cost;
        const toolTotalMessages = data.toolUsage.search.messageCount + data.toolUsage.extract.messageCount + data.toolUsage.ocr.messageCount;

        return (
          <>
            <SettingsSection title="Summary">
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Total Cost" value={formatCost(data.utilityUsage.totalCost + toolTotalCost)} />
                <StatCard label="Tokens Used" value={`${formatTokens(data.utilityUsage.inputTokens + data.utilityUsage.outputTokens)} total`} />
                <StatCard label="Background Cost" value={formatCost(data.utilityUsage.totalCost)} />
                <StatCard label="Background Calls" value={data.utilityUsage.totalCalls.toLocaleString()} />
                <StatCard label="Tool Cost" value={formatCost(toolTotalCost)} />
                <StatCard label="Tool Messages" value={toolTotalMessages.toLocaleString()} />
              </div>
            </SettingsSection>

            <SettingsSection title="By Type">
              <TypeBreakdownChart data={data} />
            </SettingsSection>
          </>
        );
      })()}
    </UsagePageLayout>
  );
}
