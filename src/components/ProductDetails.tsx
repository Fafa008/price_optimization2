import { useEffect, useState } from 'react';
import { X, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product, PriceHistory } from '../types';

interface ProductDetailsProps {
  product: Product;
  onClose: () => void;
}

export function ProductDetails({ product, onClose }: ProductDetailsProps) {
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPriceHistory();
  }, [product.id]);

  const loadPriceHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('product_id', product.id)
        .order('year')
        .order('month');

      if (error) throw error;
      setPriceHistory(data || []);
    } catch (error) {
      console.error('Error loading price history:', error);
    } finally {
      setLoading(false);
    }
  };

  const avgPrice = priceHistory.length > 0
    ? priceHistory.reduce((sum, h) => sum + h.unit_price, 0) / priceHistory.length
    : 0;

  const totalSales = priceHistory.reduce((sum, h) => sum + h.qty, 0);
  const totalRevenue = priceHistory.reduce((sum, h) => sum + h.total_price, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{product.product_id}</h2>
            <p className="text-gray-600 mt-1">{product.product_category_name.replace(/_/g, ' ')}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Avg Price</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">${avgPrice.toFixed(2)}</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Total Sales</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{totalSales}</p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Total Revenue</span>
              </div>
              <p className="text-2xl font-bold text-yellow-900">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Product Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Score:</span>
                <span className="ml-2 font-medium text-gray-900">{product.product_score}</span>
              </div>
              <div>
                <span className="text-gray-600">Weight:</span>
                <span className="ml-2 font-medium text-gray-900">{product.product_weight_g}g</span>
              </div>
              <div>
                <span className="text-gray-600">Photos:</span>
                <span className="ml-2 font-medium text-gray-900">{product.product_photos_qty}</span>
              </div>
              <div>
                <span className="text-gray-600">Volume:</span>
                <span className="ml-2 font-medium text-gray-900">{product.volume.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Price History</h3>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : priceHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No price history available</p>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Price
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Qty Sold
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Revenue
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Customers
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {priceHistory.map((history) => (
                        <tr key={history.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                            {history.month_year}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                            ${history.unit_price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                            {history.qty}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                            ${history.total_price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                            {history.customers}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
