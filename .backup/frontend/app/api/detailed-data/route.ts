import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      accountId,
      viewMode = "aggregated",
      recordType = "appointments",
      groupBy = "date",
      filters = {},
      sortBy = [],
      pageSize = 50,
      currentPage = 1,
    } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Base query based on record type
    let tableName: string;
    let dateColumn: string;

    switch (recordType) {
      case "appointments":
        tableName = "appointments";
        dateColumn = "booked_at";
        break;
      case "dials":
        tableName = "dials";
        dateColumn = "ended_at";
        break;
      case "deals":
        tableName = "deals";
        dateColumn = "closed_at";
        break;
      case "payments":
        tableName = "payments";
        dateColumn = "paid_at";
        break;
      case "leads":
        tableName = "leads";
        dateColumn = "created_at";
        break;
      default:
        return NextResponse.json(
          { error: "Invalid record type" },
          { status: 400 }
        );
    }

    if (viewMode === "aggregated") {
      // Aggregated query
      const { data, error } = await fetchAggregatedData(
        tableName,
        dateColumn,
        accountId,
        groupBy,
        filters,
        sortBy
      );

      if (error) {
        console.error("Aggregation error:", error);
        return NextResponse.json(
          { error: "Failed to fetch aggregated data" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        data,
        totalCount: data?.length || 0,
        viewMode: "aggregated",
      });
    } else {
      // Raw data query
      const offset = (currentPage - 1) * pageSize;
      
      let query = supabase
        .from(tableName)
        .select("*", { count: "exact" })
        .eq("account_id", accountId)
        .range(offset, offset + pageSize - 1);

      // Apply filters
      if (filters.dateRange?.from && filters.dateRange?.to) {
        query = query
          .gte(dateColumn, filters.dateRange.from)
          .lte(dateColumn, filters.dateRange.to);
      }

      if (filters.setterIds?.length) {
        query = query.in("setter_id", filters.setterIds);
      }

      if (filters.repIds?.length) {
        query = query.in("closer_id", filters.repIds);
      }

      // Apply sorting
      if (sortBy.length > 0) {
        sortBy.forEach((sort: any) => {
          query = query.order(sort.id, { ascending: !sort.desc });
        });
      } else {
        query = query.order(dateColumn, { ascending: false });
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Query error:", error);
        return NextResponse.json(
          { error: "Failed to fetch data" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        data,
        totalCount: count || 0,
        viewMode: "unaggregated",
      });
    }
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function fetchAggregatedData(
  tableName: string,
  dateColumn: string,
  accountId: string,
  groupBy: string,
  filters: any,
  sortBy: any[]
) {
  // Build aggregation query based on groupBy
  let selectClause = "";
  let groupByClause = "";

  switch (groupBy) {
    case "date":
      selectClause = `
        DATE(${dateColumn}) as group,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows
      `;
      groupByClause = `DATE(${dateColumn})`;
      break;
    case "setter":
      selectClause = `
        setter_id as group,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows
      `;
      groupByClause = "setter_id";
      break;
    case "week":
      selectClause = `
        DATE_TRUNC('week', ${dateColumn}) as group,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows
      `;
      groupByClause = `DATE_TRUNC('week', ${dateColumn})`;
      break;
    default:
      selectClause = `
        ${groupBy} as group,
        COUNT(*) as total
      `;
      groupByClause = groupBy;
  }

  // Execute raw SQL for aggregation
  const { data, error } = await supabase.rpc("execute_raw_sql", {
    query_text: `
      SELECT ${selectClause}
      FROM ${tableName}
      WHERE account_id = $1
      ${filters.dateRange?.from ? `AND ${dateColumn} >= $2` : ""}
      ${filters.dateRange?.to ? `AND ${dateColumn} <= $3` : ""}
      GROUP BY ${groupByClause}
      ORDER BY group DESC
    `,
    query_params: [
      accountId,
      filters.dateRange?.from,
      filters.dateRange?.to,
    ].filter(Boolean),
  });

  return { data, error };
} 