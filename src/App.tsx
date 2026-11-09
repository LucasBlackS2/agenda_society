import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Reservar from './pages/Reservar';
import MinhasReservas from './pages/MinhasReservas';
import AdminLogin from './pages/AdminLogin';
import AdminPainel from './pages/AdminPainel';
import { auth } from './api';

function RotaAdmin({ children }: { children: JSX.Element }) {
  return auth.logado() ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reservar" element={<Reservar />} />
          <Route path="/minhas-reservas" element={<MinhasReservas />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RotaAdmin>
                <AdminPainel />
              </RotaAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
