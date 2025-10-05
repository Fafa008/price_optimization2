import { useState } from 'react';
import { BarChart3, Package, TrendingUp } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { ProductList } from './components/ProductList';
import { ProductDetails } from './components/ProductDetails';
import { Product } from './types';

type View = 'dashboard' | 'products' | 'optimization';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const navigation = [
    { name: 'Dashboard', view: 'dashboard' as View, icon: BarChart3 },
    { name: 'Products', view: 'products' as View, icon: Package },
    { name: 'Optimization', view: 'optimization' as View, icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-2">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Price Optimizer</h1>
                <p className="text-xs text-gray-500">Retail Analytics Platform</p>
              </div>
            </div>

            <div className="flex gap-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.view;
                return (
                  <button
                    key={item.name}
                    onClick={() => setCurrentView(item.view)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'products' && (
          <ProductList onSelectProduct={setSelectedProduct} />
        )}
        {currentView === 'optimization' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Price Optimization
            </h2>
            <p className="text-gray-600 mb-6">
              To use price optimization, first load your data using the Python backend,
              then select a product from the Products view.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">Quick Start:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Navigate to the backend folder</li>
                <li>Install dependencies: pip install -r requirements.txt</li>
                <li>Load data: python ingest_data.py</li>
                <li>Start API: python main.py</li>
              </ol>
            </div>
          </div>
        )}
      </main>

      {selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

export default App;
