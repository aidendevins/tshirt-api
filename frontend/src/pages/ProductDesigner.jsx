import { useNavigate } from 'react-router-dom';
import ProductDesigner from '../components/ProductDesigner';

export default function ProductDesignerPage() {
  const navigate = useNavigate();
  
  return (
    <div className="product-designer-page">
      <div className="designer-container">
        <ProductDesigner
          onSave={() => navigate('/creator')}
          onCancel={() => navigate('/creator')}
        />
      </div>
    </div>
  );
}
