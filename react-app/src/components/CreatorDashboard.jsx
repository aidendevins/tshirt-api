import { useState } from 'react';

export default function CreatorDashboard({ user, onLogout }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('creator'); // 'creator' or 'community'

  // Mock data - replace with actual API calls
  const creatorProducts = [
    { id: 1, name: "Summer Vibes T-Shirt", price: "$24.99", status: "Active", sales: 12, image: "/placeholder-tshirt.jpg" },
    { id: 2, name: "Tech Logo Design", price: "$19.99", status: "Active", sales: 8, image: "/placeholder-tshirt.jpg" },
    { id: 3, name: "Minimalist Art", price: "$22.99", status: "Draft", sales: 0, image: "/placeholder-tshirt.jpg" }
  ];

  const communityProducts = [
    { id: 4, name: "Fan Design #1", price: "$24.99", status: "Active", sales: 5, fanName: "Sarah M.", image: "/placeholder-tshirt.jpg" },
    { id: 5, name: "Community Art", price: "$19.99", status: "Active", sales: 3, fanName: "Mike R.", image: "/placeholder-tshirt.jpg" },
    { id: 6, name: "Fan Creation", price: "$22.99", status: "Pending Review", sales: 0, fanName: "Alex K.", image: "/placeholder-tshirt.jpg" }
  ];

  const handleCreateProduct = () => {
    // TODO: Open product creation form/modal
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
  };

  const ProductCard = ({ product, isCommunity = false }) => (
    <div className="product-card">
      <div className="product-image">
        <img src={product.image} alt={product.name} />
        <div className="product-status">{product.status}</div>
      </div>
      <div className="product-info">
        <h3>{product.name}</h3>
        <p className="product-price">{product.price}</p>
        <p className="product-sales">{product.sales} sales</p>
        {isCommunity && (
          <p className="fan-credit">by {product.fanName}</p>
        )}
      </div>
      <div className="product-actions">
        <button className="btn-secondary">Edit</button>
        <button className="btn-danger">Delete</button>
      </div>
    </div>
  );

  return (
    <div className="creator-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1>Welcome back, {user?.firstName || 'Creator'}!</h1>
            <p>Manage your products and community designs</p>
          </div>
          <div className="header-actions">
            <button onClick={handleCreateProduct} className="btn-primary">
              + Create New Product
            </button>
            <button onClick={onLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-tabs">
          <button 
            className={`tab-button ${activeTab === 'creator' ? 'active' : ''}`}
            onClick={() => setActiveTab('creator')}
          >
            Your Designs ({creatorProducts.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'community' ? 'active' : ''}`}
            onClick={() => setActiveTab('community')}
          >
            Community Designs ({communityProducts.length})
          </button>
        </div>

        <div className="products-section">
          <div className="section-header">
            <h2>
              {activeTab === 'creator' ? 'Your Product Designs' : 'Community Designs'}
            </h2>
            <p>
              {activeTab === 'creator' 
                ? 'Products you\'ve designed and submitted' 
                : 'Designs created by your fans using the AI tool'
              }
            </p>
          </div>

          <div className="products-grid">
            {activeTab === 'creator' ? (
              creatorProducts.length > 0 ? (
                creatorProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))
              ) : (
                <div className="empty-state">
                  <h3>No products yet</h3>
                  <p>Create your first product design to get started!</p>
                  <button onClick={handleCreateProduct} className="btn-primary">
                    Create Your First Product
                  </button>
                </div>
              )
            ) : (
              communityProducts.length > 0 ? (
                communityProducts.map(product => (
                  <ProductCard key={product.id} product={product} isCommunity={true} />
                ))
              ) : (
                <div className="empty-state">
                  <h3>No community designs yet</h3>
                  <p>Share your AI tool with fans to start receiving community designs!</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Create Product Modal - Placeholder */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create New Product</h2>
              <button onClick={handleCloseModal} className="modal-close">&times;</button>
            </div>
            <div className="modal-body">
              <p>Product creation form will go here.</p>
              <p>This will integrate with your existing test.html creator tool.</p>
            </div>
            <div className="modal-footer">
              <button onClick={handleCloseModal} className="btn-secondary">Cancel</button>
              <button className="btn-primary">Create Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
