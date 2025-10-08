import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Package, DollarSign } from "lucide-react";
import { supabase } from "../lib/supabase";
import { AnalyticsSummary } from "../types";

export function Dashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverage, setCoverage] = useState<{ start?: string; end?: string }>(
    {}
  );

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const { data: productsData } = await supabase
        .from("products")
        .select("id", { count: "exact" });

      const { data: priceData } = await supabase
        .from("price_history")
        .select("total_price, unit_price");

      const totalProducts = productsData?.length || 0;
      const totalRecords = priceData?.length || 0;
      const totalRevenue =
        priceData?.reduce(
          (sum, record) => sum + (record.total_price || 0),
          0
        ) || 0;
      const avgPrice =
        priceData && priceData.length > 0
          ? priceData.reduce(
              (sum, record) => sum + (record.unit_price || 0),
              0
            ) / priceData.length
          : 0;

      setSummary({
        total_products: totalProducts,
        total_records: totalRecords,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        average_price: Math.round(avgPrice * 100) / 100,
      });

      // Discover dataset temporal coverage (first and last records)
      const { data: firstRec } = await supabase
        .from("price_history")
        .select("month_year, year, month")
        .order("year", { ascending: true })
        .order("month", { ascending: true })
        .limit(1)
        .maybeSingle();
      const { data: lastRec } = await supabase
        .from("price_history")
        .select("month_year, year, month")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(1)
        .maybeSingle();
      const fmt = (r?: any) =>
        r
          ? r.month_year ||
            `${String(r.year).padStart(4, "0")}-${String(r.month).padStart(
              2,
              "0"
            )}`
          : undefined;
      setCoverage({ start: fmt(firstRec), end: fmt(lastRec) });
    } catch (error) {
      console.error("Error loading summary:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = [
    {
      name: "Total Products",
      value: summary?.total_products || 0,
      icon: Package,
      color: "bg-blue-500",
    },
    {
      name: "Price Records",
      value: summary?.total_records || 0,
      icon: BarChart3,
      color: "bg-green-500",
    },
    {
      name: "Total Revenue",
      value: `$${(summary?.total_revenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "bg-yellow-500",
    },
    {
      name: "Average Price",
      value: `$${(summary?.average_price || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: "bg-purple-500",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Tableau de bord analytique
        </h2>
        <p className="text-gray-600 mt-1">
          Vue d’ensemble de vos données de tarification
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} rounded-lg p-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
