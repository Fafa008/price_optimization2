import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  PlugZap,
  RefreshCw,
  Target,
  PackageSearch,
} from "lucide-react";

interface ApiProduct {
  id: string;
  product_id: string;
  product_category_name: string;
  product_score: number;
}

interface ApiSummary {
  total_products: number;
  total_records: number;
  total_revenue: number;
  average_price: number;
}

interface OptimizeResponse {
  product_id: string;
  result: {
    current_price: number;
    optimized_price: number;
    expected_revenue: number;
    price_change_percentage: number;
    scenarios: Array<{
      price: number;
      predicted_quantity: number;
      predicted_revenue: number;
    }>;
  };
  model: {
    r_squared: number;
    coefficients: number[];
    intercept: number;
  };
}

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function Optimization() {
  const [ping, setPing] = useState<string>("");
  const [loadingPing, setLoadingPing] = useState<boolean>(false);

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  const [summary, setSummary] = useState<ApiSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [optimizing, setOptimizing] = useState<boolean>(false);
  const [optResult, setOptResult] = useState<OptimizeResponse | null>(null);
  const [elasticity, setElasticity] = useState<number | null>(null);

  const apiUrl = useMemo(() => apiBaseUrl.replace(/\/$/, ""), []);
  const hasApiPrefix = useMemo(() => /\/(api)$/i.test(apiUrl), [apiUrl]);
  const buildUrl = useMemo(() => {
    return (path: string) => {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const finalPath = hasApiPrefix
        ? normalizedPath.replace(/^\/api\b/i, "")
        : normalizedPath;
      return `${apiUrl}${finalPath}`;
    };
  }, [apiUrl, hasApiPrefix]);

  useEffect(() => {
    void checkPing();
    void loadProducts();
    void loadSummary();
  }, []);

  const checkPing = async () => {
    try {
      setLoadingPing(true);
      setError(null);
      const pingUrl = hasApiPrefix ? `${apiUrl}` : `${apiUrl}/`;
      const res = await fetch(pingUrl);
      const json = await res.json();
      setPing(`${json.message} (${json.status})`);
    } catch (e) {
      setError("Failed to reach API root");
    } finally {
      setLoadingPing(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      setError(null);
      const res = await fetch(buildUrl("/api/products"));
      const json = await res.json();
      setProducts(json.products || []);
    } catch (e) {
      setError("Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadSummary = async () => {
    try {
      setLoadingSummary(true);
      setError(null);
      const res = await fetch(buildUrl("/api/analytics/summary"));
      const json = await res.json();
      setSummary(json);
    } catch (e) {
      setError("Failed to load analytics summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  const selectedProduct = products.find(
    (p) => p.product_id === selectedProductId
  );

  const runOptimization = async () => {
    if (!selectedProductId) return;
    try {
      setOptimizing(true);
      setError(null);
      setOptResult(null);
      const res = await fetch(buildUrl("/api/optimize"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: selectedProductId }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Optimization failed");
      }
      const json: OptimizeResponse = await res.json();
      setOptResult(json);
    } catch (e: any) {
      setError(e?.message || "Failed to run optimization");
    } finally {
      setOptimizing(false);
    }
  };

  const loadElasticity = async () => {
    if (!selectedProductId) return;
    try {
      setError(null);
      const res = await fetch(
        buildUrl(`/api/products/${selectedProductId}/elasticity`)
      );
      const json = await res.json();
      setElasticity(
        typeof json.elasticity === "number" ? json.elasticity : null
      );
    } catch (e) {
      setElasticity(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          Price Optimization
        </h2>
        <p className="text-gray-600 mt-1">
          Interact with FastAPI backend for optimization workflow
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PlugZap className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-900">
                API Connection
              </span>
            </div>
            <button
              onClick={checkPing}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
          <p className="text-xs text-gray-500 break-all mb-2">
            Base URL: {apiUrl}
          </p>
          {loadingPing ? (
            <p className="text-gray-600">Checking...</p>
          ) : ping ? (
            <p className="text-green-700 bg-green-50 rounded-md px-3 py-2 inline-block">
              {ping}
            </p>
          ) : (
            <p className="text-gray-600">
              Click Refresh to check connectivity.
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PackageSearch className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-gray-900">Select Product</span>
          </div>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            disabled={loadingProducts}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">
              {loadingProducts ? "Loading products…" : "Choose a product..."}
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.product_id}>
                {p.product_id} — {p.product_category_name.replace(/_/g, " ")}{" "}
                (score {p.product_score.toFixed(1)})
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">
              Analytics Summary
            </span>
          </div>
          {loadingSummary ? (
            <p className="text-gray-600">Loading summary...</p>
          ) : summary ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-600">Products</p>
                <p className="text-lg font-semibold text-gray-900">
                  {summary.total_products}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-600">Records</p>
                <p className="text-lg font-semibold text-gray-900">
                  {summary.total_records}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-600">Revenue</p>
                <p className="text-lg font-semibold text-gray-900">
                  ${summary.total_revenue.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-600">Avg Price</p>
                <p className="text-lg font-semibold text-gray-900">
                  ${summary.average_price.toFixed(2)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No summary available.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Optimization</h3>
        {!selectedProduct ? (
          <p className="text-gray-600">Select a product to begin optimizing.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-gray-700">
                Selected product:{" "}
                <span className="font-medium">
                  {selectedProduct.product_id}
                </span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={loadElasticity}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Load Elasticity
                </button>
                <button
                  onClick={runOptimization}
                  disabled={optimizing}
                  className={`px-4 py-2 rounded-lg text-white ${
                    optimizing ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {optimizing ? "Optimizing…" : "Run Optimization"}
                </button>
              </div>
            </div>

            {elasticity !== null && (
              <div className="bg-yellow-50 rounded-lg p-4 text-sm">
                <p className="text-yellow-900">
                  Price Elasticity:{" "}
                  <span className="font-semibold">{elasticity.toFixed(3)}</span>
                </p>
              </div>
            )}

            {optResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-600 text-sm">Current Price</p>
                    <p className="text-xl font-semibold text-gray-900">
                      ${optResult.result.current_price.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-green-700 text-sm">Optimized Price</p>
                    <p className="text-xl font-semibold text-green-800">
                      ${optResult.result.optimized_price.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-blue-700 text-sm">Expected Revenue</p>
                    <p className="text-xl font-semibold text-blue-800">
                      $
                      {optResult.result.expected_revenue.toLocaleString(
                        undefined,
                        { maximumFractionDigits: 2 }
                      )}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-purple-700 text-sm">Price Change</p>
                    <p className="text-xl font-semibold text-purple-800">
                      {optResult.result.price_change_percentage.toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 font-medium text-gray-900">
                    Scenarios
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-600">
                            Price
                          </th>
                          <th className="px-4 py-2 text-left text-gray-600">
                            Predicted Qty
                          </th>
                          <th className="px-4 py-2 text-left text-gray-600">
                            Predicted Revenue
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {optResult.result.scenarios
                          .slice(0, 20)
                          .map((s, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2">
                                ${s.price.toFixed(2)}
                              </td>
                              <td className="px-4 py-2">
                                {s.predicted_quantity.toFixed(2)}
                              </td>
                              <td className="px-4 py-2">
                                $
                                {s.predicted_revenue.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-700">
                  <p className="font-semibold mb-2">Model Summary</p>
                  <p>R²: {optResult.model.r_squared.toFixed(4)}</p>
                  <p>Intercept: {optResult.model.intercept.toFixed(4)}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 rounded-lg p-3">
          {error}
        </div>
      )}
    </div>
  );
}

export default Optimization;
