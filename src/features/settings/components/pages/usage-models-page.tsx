"use client";

import { InfoIcon } from "lucide-react";
import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";

import type { ChartConfig } from "~/components/ui/chart";
import type { UsageData } from "~/features/usage/actions";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

import { SettingsSection } from "../ui/settings-section";
import {
  CHART_COLORS,
  formatCost,
  formatTokens,
  UsagePageLayout,
  useUsagePage,
} from "./usage-shared";

function ModelCostChart({ data }: { data: UsageData["modelUsage"] }) {
  const chartData = useMemo(() => {
    const top5 = data.slice(0, 5);
    const rest = data.slice(5);
    const entries = top5.map((m, i) => ({
      name: m.model.split("/").pop() ?? m.model,
      key: `${m.model}-${m.provider ?? "unknown"}-${i}`,
      value: m.cost,
      fullName: m.model,
    }));
    if (rest.length > 0) {
      entries.push({
        name: "Other",
        key: "other",
        value: rest.reduce((sum, m) => sum + m.cost, 0),
        fullName: `${rest.length} other models`,
      });
    }
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
    return null;
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
            {chartData.map((entry, i) => (
              <Cell
                key={entry.key}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="flex flex-col gap-1.5 text-sm">
        {chartData.map((entry, i) => (
          <div key={entry.key} className="flex items-center gap-2">
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

export function UsageModelsPage() {
  const { period, setPeriod, data, isLoading } = useUsagePage();

  return (
    <UsagePageLayout period={period} setPeriod={setPeriod} data={data} isLoading={isLoading}>
      {data && (
        data.modelUsage.length === 0
          ? (
              <SettingsSection title="Models">
                <p className="text-muted-foreground text-sm">No model usage data for this period.</p>
              </SettingsSection>
            )
          : (
              <>
                <SettingsSection title="Cost by Model">
                  <ModelCostChart data={data.modelUsage} />
                </SettingsSection>

                <SettingsSection title="Model Details">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Model</TableHead>
                          <TableHead>Provider</TableHead>
                          <TableHead className="text-right">Messages</TableHead>
                          <TableHead className="text-right">Input</TableHead>
                          <TableHead className="text-right">Output</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.modelUsage.map((model, i) => (
                          <TableRow key={`${model.model}-${model.provider ?? "unknown"}-${i}`}>
                            <TableCell className="max-w-48 truncate font-medium">
                              {model.model}
                            </TableCell>
                            <TableCell className={`
                              text-muted-foreground capitalize
                            `}
                            >
                              {model.provider === "unknown"
                                ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className={`
                                          inline-flex cursor-default
                                          items-center gap-1
                                        `}
                                        >
                                          Unknown
                                          <InfoIcon className="size-3" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Tracked before provider data was collected
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                : model.provider}
                            </TableCell>
                            <TableCell className="text-right">
                              {model.messageCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatTokens(model.inputTokens)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatTokens(model.outputTokens)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCost(model.cost)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </SettingsSection>
              </>
            )
      )}
    </UsagePageLayout>
  );
}
