"use server";

import { sql } from "drizzle-orm";

import { getRequiredSession } from "~/features/auth/lib/session";
import { db } from "~/lib/db";
import { messageMetadata, messages, threads } from "~/lib/db/schema/chat";
import { utilityUsage } from "~/lib/db/schema/usage";

export type DailySpend = {
  date: string;
  cost: number;
};

export type ModelUsage = {
  model: string;
  provider: string;
  messageCount: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
};

export type UtilityTypeBreakdown = {
  type: string;
  calls: number;
  cost: number;
};

export type CategoryBreakdown = {
  prompt: number;
  completion: number;
  search: number;
  extract: number;
  ocr: number;
  utility: number;
};

export type ToolUsageItem = {
  cost: number;
  messageCount: number;
};

export type ToolUsage = {
  search: ToolUsageItem;
  extract: ToolUsageItem;
  ocr: ToolUsageItem;
};

export type UsageData = {
  totalCost: number;
  totalMessages: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  dailySpend: DailySpend[];
  modelUsage: ModelUsage[];
  categoryBreakdown: CategoryBreakdown;
  utilityUsage: {
    totalCost: number;
    totalCalls: number;
    inputTokens: number;
    outputTokens: number;
    typeBreakdown: UtilityTypeBreakdown[];
  };
  toolUsage: ToolUsage;
};

function getStartDate(period: "7d" | "30d" | "90d" | "all"): Date | null {
  if (period === "all")
    return null;
  const days = { "7d": 7, "30d": 30, "90d": 90 }[period];
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export async function getUsageData(period: "7d" | "30d" | "90d" | "all"): Promise<UsageData> {
  const session = await getRequiredSession();
  const userId = session.user.id;
  const startDate = getStartDate(period);
  const startDateStr = startDate?.toISOString() ?? null;

  const dateFilter = startDateStr
    ? sql`AND ${messageMetadata.createdAt} >= ${startDateStr}`
    : sql``;

  const utilityDateFilter = startDateStr
    ? sql`AND ${utilityUsage.createdAt} >= ${startDateStr}`
    : sql``;

  const [totalsResult, dailyResult, modelResult, categoryResult, utilityResult, utilityTypeResult, toolUsageResult] = await Promise.all([
    // 1. Totals
    db.execute<{
      total_cost: string | null;
      total_messages: string | null;
      total_input_tokens: string | null;
      total_output_tokens: string | null;
    }>(sql`
      SELECT
        COALESCE(SUM(${messageMetadata.costTotalUsd}::numeric), 0) AS total_cost,
        COUNT(*) AS total_messages,
        COALESCE(SUM(${messageMetadata.inputTokens}), 0) AS total_input_tokens,
        COALESCE(SUM(${messageMetadata.outputTokens}), 0) AS total_output_tokens
      FROM ${messageMetadata}
      JOIN ${messages} ON ${messages.id} = ${messageMetadata.messageId}
      JOIN ${threads} ON ${threads.id} = ${messages.threadId}
      WHERE ${threads.userId} = ${userId}
      ${dateFilter}
    `),

    // 2. Daily spend
    db.execute<{
      date: string;
      cost: string | null;
    }>(sql`
      SELECT
        TO_CHAR(${messageMetadata.createdAt}, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(${messageMetadata.costTotalUsd}::numeric), 0) AS cost
      FROM ${messageMetadata}
      JOIN ${messages} ON ${messages.id} = ${messageMetadata.messageId}
      JOIN ${threads} ON ${threads.id} = ${messages.threadId}
      WHERE ${threads.userId} = ${userId}
      ${dateFilter}
      GROUP BY TO_CHAR(${messageMetadata.createdAt}, 'YYYY-MM-DD')
      ORDER BY date ASC
    `),

    // 3. Model usage
    db.execute<{
      model: string | null;
      provider: string | null;
      message_count: string | null;
      input_tokens: string | null;
      output_tokens: string | null;
      cost: string | null;
    }>(sql`
      SELECT
        ${messageMetadata.model} AS model,
        ${messageMetadata.provider} AS provider,
        COUNT(*) AS message_count,
        COALESCE(SUM(${messageMetadata.inputTokens}), 0) AS input_tokens,
        COALESCE(SUM(${messageMetadata.outputTokens}), 0) AS output_tokens,
        COALESCE(SUM(${messageMetadata.costTotalUsd}::numeric), 0) AS cost
      FROM ${messageMetadata}
      JOIN ${messages} ON ${messages.id} = ${messageMetadata.messageId}
      JOIN ${threads} ON ${threads.id} = ${messages.threadId}
      WHERE ${threads.userId} = ${userId}
      ${dateFilter}
      GROUP BY ${messageMetadata.model}, ${messageMetadata.provider}
      ORDER BY cost DESC
    `),

    // 4. Category breakdown
    db.execute<{
      prompt: string | null;
      completion: string | null;
      search: string | null;
      extract: string | null;
      ocr: string | null;
    }>(sql`
      SELECT
        COALESCE(SUM((${messageMetadata.costBreakdown}->>'promptCost')::numeric), 0) AS prompt,
        COALESCE(SUM((${messageMetadata.costBreakdown}->>'completionCost')::numeric), 0) AS completion,
        COALESCE(SUM((${messageMetadata.costBreakdown}->>'search')::numeric), 0) AS search,
        COALESCE(SUM((${messageMetadata.costBreakdown}->>'extract')::numeric), 0) AS extract,
        COALESCE(SUM((${messageMetadata.costBreakdown}->>'ocr')::numeric), 0) AS ocr
      FROM ${messageMetadata}
      JOIN ${messages} ON ${messages.id} = ${messageMetadata.messageId}
      JOIN ${threads} ON ${threads.id} = ${messages.threadId}
      WHERE ${threads.userId} = ${userId}
      ${dateFilter}
    `),

    // 5. Utility totals
    db.execute<{
      total_cost: string | null;
      total_calls: string | null;
      input_tokens: string | null;
      output_tokens: string | null;
    }>(sql`
      SELECT
        COALESCE(SUM(${utilityUsage.costTotalUsd}::numeric), 0) AS total_cost,
        COUNT(*) AS total_calls,
        COALESCE(SUM(${utilityUsage.inputTokens}), 0) AS input_tokens,
        COALESCE(SUM(${utilityUsage.outputTokens}), 0) AS output_tokens
      FROM ${utilityUsage}
      WHERE ${utilityUsage.userId} = ${userId}
      ${utilityDateFilter}
    `),

    // 6. Utility type breakdown
    db.execute<{
      type: string | null;
      calls: string | null;
      cost: string | null;
    }>(sql`
      SELECT
        ${utilityUsage.type} AS type,
        COUNT(*) AS calls,
        COALESCE(SUM(${utilityUsage.costTotalUsd}::numeric), 0) AS cost
      FROM ${utilityUsage}
      WHERE ${utilityUsage.userId} = ${userId}
      ${utilityDateFilter}
      GROUP BY ${utilityUsage.type}
      ORDER BY cost DESC
    `),

    // 7. Tool usage (search, extract, ocr) with message counts
    db.execute<{
      search_cost: string | null;
      search_messages: string | null;
      extract_cost: string | null;
      extract_messages: string | null;
      ocr_cost: string | null;
      ocr_messages: string | null;
    }>(sql`
      SELECT
        COALESCE(SUM((${messageMetadata.costBreakdown}->>'search')::numeric), 0) AS search_cost,
        COUNT(*) FILTER (WHERE (${messageMetadata.costBreakdown}->>'search')::numeric > 0) AS search_messages,
        COALESCE(SUM((${messageMetadata.costBreakdown}->>'extract')::numeric), 0) AS extract_cost,
        COUNT(*) FILTER (WHERE (${messageMetadata.costBreakdown}->>'extract')::numeric > 0) AS extract_messages,
        COALESCE(SUM((${messageMetadata.costBreakdown}->>'ocr')::numeric), 0) AS ocr_cost,
        COUNT(*) FILTER (WHERE (${messageMetadata.costBreakdown}->>'ocr')::numeric > 0) AS ocr_messages
      FROM ${messageMetadata}
      JOIN ${messages} ON ${messages.id} = ${messageMetadata.messageId}
      JOIN ${threads} ON ${threads.id} = ${messages.threadId}
      WHERE ${threads.userId} = ${userId}
      ${dateFilter}
    `),
  ]);

  // Handle different return types from postgres-js (array) vs neon-serverless (QueryResult)
  function rows<T>(result: unknown): T[] {
    const r = result as Record<string, unknown>;
    return ("rows" in r ? r.rows : result) as T[];
  }

  const totals = rows<{
    total_cost: string | null;
    total_messages: string | null;
    total_input_tokens: string | null;
    total_output_tokens: string | null;
  }>(totalsResult)[0];

  const daily = rows<{ date: string; cost: string | null }>(dailyResult);
  const models = rows<{
    model: string | null;
    provider: string | null;
    message_count: string | null;
    input_tokens: string | null;
    output_tokens: string | null;
    cost: string | null;
  }>(modelResult);

  const category = rows<{
    prompt: string | null;
    completion: string | null;
    search: string | null;
    extract: string | null;
    ocr: string | null;
  }>(categoryResult)[0];

  const utility = rows<{
    total_cost: string | null;
    total_calls: string | null;
    input_tokens: string | null;
    output_tokens: string | null;
  }>(utilityResult)[0];

  const utilityTypes = rows<{
    type: string | null;
    calls: string | null;
    cost: string | null;
  }>(utilityTypeResult);

  const toolUsage = rows<{
    search_cost: string | null;
    search_messages: string | null;
    extract_cost: string | null;
    extract_messages: string | null;
    ocr_cost: string | null;
    ocr_messages: string | null;
  }>(toolUsageResult)[0];

  return {
    totalCost: Number(totals?.total_cost ?? 0),
    totalMessages: Number(totals?.total_messages ?? 0),
    totalInputTokens: Number(totals?.total_input_tokens ?? 0),
    totalOutputTokens: Number(totals?.total_output_tokens ?? 0),
    dailySpend: daily.map(row => ({
      date: row.date,
      cost: Number(row.cost ?? 0),
    })),
    modelUsage: models.map(row => ({
      model: row.model ?? "unknown",
      provider: row.provider ?? "unknown",
      messageCount: Number(row.message_count ?? 0),
      inputTokens: Number(row.input_tokens ?? 0),
      outputTokens: Number(row.output_tokens ?? 0),
      cost: Number(row.cost ?? 0),
    })),
    categoryBreakdown: {
      prompt: Number(category?.prompt ?? 0),
      completion: Number(category?.completion ?? 0),
      search: Number(category?.search ?? 0),
      extract: Number(category?.extract ?? 0),
      ocr: Number(category?.ocr ?? 0),
      utility: Number(utility?.total_cost ?? 0),
    },
    utilityUsage: {
      totalCost: Number(utility?.total_cost ?? 0),
      totalCalls: Number(utility?.total_calls ?? 0),
      inputTokens: Number(utility?.input_tokens ?? 0),
      outputTokens: Number(utility?.output_tokens ?? 0),
      typeBreakdown: utilityTypes.map(row => ({
        type: row.type ?? "unknown",
        calls: Number(row.calls ?? 0),
        cost: Number(row.cost ?? 0),
      })),
    },
    toolUsage: {
      search: {
        cost: Number(toolUsage?.search_cost ?? 0),
        messageCount: Number(toolUsage?.search_messages ?? 0),
      },
      extract: {
        cost: Number(toolUsage?.extract_cost ?? 0),
        messageCount: Number(toolUsage?.extract_messages ?? 0),
      },
      ocr: {
        cost: Number(toolUsage?.ocr_cost ?? 0),
        messageCount: Number(toolUsage?.ocr_messages ?? 0),
      },
    },
  };
}
