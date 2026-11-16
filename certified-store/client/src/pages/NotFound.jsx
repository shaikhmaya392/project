import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container pad-y narrow center">
      <h1>Page not found</h1>
      <p className="muted">The page you are looking for does not exist.</p>
      <div className="row-center"><Link className="btn btn-primary" to="/">Home</Link><Link className="btn btn-outline" to="/catalog">All products</Link></div>
    </div>
  );
}
