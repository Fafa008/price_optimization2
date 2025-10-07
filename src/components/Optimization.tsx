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
  const [chartMetric, setChartMetric] = useState<
    "predicted_quantity" | "predicted_revenue"
  >("predicted_revenue");

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
      setError("Échec de connexion à la racine de l’API");
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
      setError("Échec du chargement des produits");
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
      setError("Échec du chargement de la synthèse analytique");
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
        throw new Error(t || "L’optimisation a échoué");
      }
      const json: OptimizeResponse = await res.json();
      setOptResult(json);
    } catch (e: any) {
      setError(e?.message || "Échec de l’optimisation");
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
          Optimisation des prix
        </h2>
        <p className="text-gray-600 mt-1">
          Interagissez avec l’API FastAPI pour le flux d’optimisation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PlugZap className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-900">Connexion API</span>
            </div>
            <button
              onClick={checkPing}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>
          <p className="text-xs text-gray-500 break-all mb-2">
            URL de base : {apiUrl}
          </p>
          {loadingPing ? (
            <p className="text-gray-600">Vérification…</p>
          ) : ping ? (
            <p className="text-green-700 bg-green-50 rounded-md px-3 py-2 inline-block">
              {ping}
            </p>
          ) : (
            <p className="text-gray-600">
              Cliquez sur Actualiser pour tester la connectivité.
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PackageSearch className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-gray-900">
              Sélectionner un produit
            </span>
          </div>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            disabled={loadingProducts}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">
              {loadingProducts
                ? "Chargement des produits…"
                : "Choisissez un produit…"}
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
              Synthèse analytique
            </span>
          </div>
          {loadingSummary ? (
            <p className="text-gray-600">Chargement de la synthèse…</p>
          ) : summary ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-600">Produits</p>
                <p className="text-lg font-semibold text-gray-900">
                  {summary.total_products}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-600">Enregistrements</p>
                <p className="text-lg font-semibold text-gray-900">
                  {summary.total_records}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-600">Chiffre d’affaires</p>
                <p className="text-lg font-semibold text-gray-900">
                  ${summary.total_revenue.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-600">Prix moyen</p>
                <p className="text-lg font-semibold text-gray-900">
                  ${summary.average_price.toFixed(2)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">Aucune synthèse disponible.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Optimisation</h3>
        {!selectedProduct ? (
          <p className="text-gray-600">
            Sélectionnez un produit pour commencer l’optimisation.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-gray-700">
                Produit sélectionné :{" "}
                <span className="font-medium">
                  {selectedProduct.product_id}
                </span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={loadElasticity}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Charger l’élasticité
                </button>
                <button
                  onClick={runOptimization}
                  disabled={optimizing}
                  className={`px-4 py-2 rounded-lg text-white ${
                    optimizing ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {optimizing ? "Optimisation…" : "Lancer l’optimisation"}
                </button>
              </div>
            </div>

            {elasticity !== null && (
              <div className="bg-yellow-50 rounded-lg p-4 text-sm">
                <p className="text-yellow-900">
                  Élasticité prix :{" "}
                  <span className="font-semibold">{elasticity.toFixed(3)}</span>
                </p>
              </div>
            )}

            {optResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-600 text-sm">Prix actuel</p>
                    <p className="text-xl font-semibold text-gray-900">
                      ${optResult.result.current_price.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-green-700 text-sm">Prix optimisé</p>
                    <p className="text-xl font-semibold text-green-800">
                      ${optResult.result.optimized_price.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-blue-700 text-sm">Revenu attendu</p>
                    <p className="text-xl font-semibold text-blue-800">
                      $
                      {optResult.result.expected_revenue.toLocaleString(
                        undefined,
                        { maximumFractionDigits: 2 }
                      )}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-purple-700 text-sm">Variation de prix</p>
                    <p className="text-xl font-semibold text-purple-800">
                      {optResult.result.price_change_percentage.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Explanation block */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm text-gray-700">
                  <p className="font-medium text-gray-900 mb-2">
                    Comment lire ces résultats
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      <span className="font-medium">Le prix optimisé</span> est
                      choisi pour maximiser le revenu prédit sur une grille de
                      prix candidats.
                    </li>
                    <li>
                      Le modèle est une régression linéaire entraînée sur
                      l’historique récent des prix avec des variables comme le
                      coût de transport, les effets calendrier, le score produit
                      et le prix décalé.
                    </li>
                    <li>
                      <span className="font-medium">R²</span> indique la qualité
                      d’ajustement sur l’ensemble d’entraînement. À prendre
                      comme un signal : des valeurs faibles suggèrent une
                      généralisation limitée.
                    </li>
                    <li>
                      Le tableau et le graphique des scénarios illustrent le
                      compromis entre prix et demande/revenu. Le repère vert met
                      en évidence le prix recommandé.
                    </li>
                    <li>
                      Considérez ces résultats comme directionnels. En
                      production, ajoutez validation, gestion des valeurs
                      aberrantes et tests A/B.
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 font-medium text-gray-900">
                    Scénarios
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-600">
                            Prix
                          </th>
                          <th className="px-4 py-2 text-left text-gray-600">
                            Qté prédite
                          </th>
                          <th className="px-4 py-2 text-left text-gray-600">
                            Revenu prédit
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

                {/* Prediction Chart */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <div className="font-medium text-gray-900">
                      Graphique de prédiction
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <button
                        onClick={() => setChartMetric("predicted_quantity")}
                        className={`px-3 py-1 rounded-md border ${
                          chartMetric === "predicted_quantity"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        Quantité
                      </button>
                      <button
                        onClick={() => setChartMetric("predicted_revenue")}
                        className={`px-3 py-1 rounded-md border ${
                          chartMetric === "predicted_revenue"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        Revenu
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-4">
                    {(() => {
                      const scenarios = optResult.result.scenarios.slice();
                      if (scenarios.length === 0)
                        return (
                          <p className="text-sm text-gray-600">
                            Aucun scénario.
                          </p>
                        );
                      // Ensure sorted by price
                      scenarios.sort((a, b) => a.price - b.price);

                      const values = scenarios.map((s) => s[chartMetric]);
                      const prices = scenarios.map((s) => s.price);
                      const minX = Math.min(...prices);
                      const maxX = Math.max(...prices);
                      const minY = Math.min(...values);
                      const maxY = Math.max(...values);

                      // Chart box
                      const width = 720; // allow horizontal scrolling if narrow container
                      const height = 260;
                      const margin = {
                        top: 10,
                        right: 16,
                        bottom: 28,
                        left: 44,
                      };
                      const iw = width - margin.left - margin.right;
                      const ih = height - margin.top - margin.bottom;

                      const xScale = (x: number) =>
                        iw === 0 || maxX === minX
                          ? margin.left
                          : margin.left + ((x - minX) / (maxX - minX)) * iw;
                      const yScale = (y: number) =>
                        ih === 0 || maxY === minY
                          ? margin.top + ih
                          : margin.top + ih - ((y - minY) / (maxY - minY)) * ih;

                      const pathD = scenarios
                        .map(
                          (s, i) =>
                            `${i === 0 ? "M" : "L"}${xScale(s.price)},${yScale(
                              s[chartMetric]
                            )}`
                        )
                        .join(" ");

                      // Ticks
                      const xTicks = 5;
                      const yTicks = 5;
                      const xTickValues = Array.from(
                        { length: xTicks + 1 },
                        (_, i) => minX + (i * (maxX - minX)) / xTicks
                      );
                      const yTickValues = Array.from(
                        { length: yTicks + 1 },
                        (_, i) => minY + (i * (maxY - minY)) / yTicks
                      );

                      const formatCurrency = (v: number) =>
                        `$${v.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}`;
                      const formatNumber = (v: number) =>
                        v.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        });

                      return (
                        <div className="overflow-x-auto">
                          <svg
                            width={width}
                            height={height}
                            className="min-w-full"
                          >
                            {/* Axes */}
                            <line
                              x1={margin.left}
                              y1={margin.top + ih}
                              x2={margin.left + iw}
                              y2={margin.top + ih}
                              stroke="#E5E7EB"
                            />
                            <line
                              x1={margin.left}
                              y1={margin.top}
                              x2={margin.left}
                              y2={margin.top + ih}
                              stroke="#E5E7EB"
                            />

                            {/* X ticks */}
                            {xTickValues.map((v, i) => (
                              <g key={`xt-${i}`}>
                                <line
                                  x1={xScale(v)}
                                  y1={margin.top + ih}
                                  x2={xScale(v)}
                                  y2={margin.top + ih + 4}
                                  stroke="#9CA3AF"
                                />
                                <text
                                  x={xScale(v)}
                                  y={margin.top + ih + 16}
                                  textAnchor="middle"
                                  fontSize="10"
                                  fill="#6B7280"
                                >
                                  {formatCurrency(v)}
                                </text>
                              </g>
                            ))}

                            {/* Y ticks */}
                            {yTickValues.map((v, i) => (
                              <g key={`yt-${i}`}>
                                <line
                                  x1={margin.left - 4}
                                  y1={yScale(v)}
                                  x2={margin.left}
                                  y2={yScale(v)}
                                  stroke="#9CA3AF"
                                />
                                <text
                                  x={margin.left - 8}
                                  y={yScale(v) + 3}
                                  textAnchor="end"
                                  fontSize="10"
                                  fill="#6B7280"
                                >
                                  {chartMetric === "predicted_revenue"
                                    ? formatCurrency(v)
                                    : formatNumber(v)}
                                </text>
                                <line
                                  x1={margin.left}
                                  y1={yScale(v)}
                                  x2={margin.left + iw}
                                  y2={yScale(v)}
                                  stroke="#F3F4F6"
                                />
                              </g>
                            ))}

                            {/* Line path */}
                            <path
                              d={pathD}
                              fill="none"
                              stroke="#2563EB"
                              strokeWidth={2}
                            />

                            {/* Optimized point marker */}
                            {(() => {
                              const px = optResult.result.optimized_price;
                              const match = scenarios.reduce(
                                (best, s) =>
                                  Math.abs(s.price - px) <
                                  Math.abs(best.price - px)
                                    ? s
                                    : best,
                                scenarios[0]
                              );
                              const cx = xScale(match.price);
                              const cy = yScale(match[chartMetric]);
                              return (
                                <g>
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={4}
                                    fill="#10B981"
                                  />
                                  <text
                                    x={cx + 6}
                                    y={cy - 6}
                                    fontSize="10"
                                    fill="#065F46"
                                  >
                                    Opt @ {formatCurrency(match.price)}
                                  </text>
                                </g>
                              );
                            })()}
                          </svg>
                          <div className="text-xs text-gray-600 mt-2">
                            X : Prix, Y :{" "}
                            {chartMetric === "predicted_revenue"
                              ? "Revenu prédit"
                              : "Quantité prédite"}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-700">
                  <p className="font-semibold mb-2">Résumé du modèle</p>
                  <p>R² : {optResult.model.r_squared.toFixed(4)}</p>
                  <p>Intercept : {optResult.model.intercept.toFixed(4)}</p>
                  {optResult.model.coefficients && (
                    <div className="mt-2">
                      <p className="font-medium">
                        Effet des variables (coefficients)
                      </p>
                      <p className="text-gray-600">
                        Des valeurs absolues plus élevées indiquent une
                        influence plus forte sur la quantité prédite. Les
                        valeurs positives augmentent la quantité ; les négatives
                        la réduisent.
                      </p>
                    </div>
                  )}
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
